import { GoogleGenerativeAI } from '@google/generative-ai';
import { z, type ZodSchema } from 'zod';
import { getOpenAI, OPENAI_MODEL } from '@/lib/openai';

export type AiProvider = 'gemini' | 'openai' | 'local';
export type AiCapability = 'json' | 'long-context' | 'low-latency';

export interface AiGatewayMetadata {
  useCase?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface AiGatewayRequest {
  prompt: string;
  responseSchema?: ZodSchema;
  metadata?: AiGatewayMetadata;
  preferredProviders?: AiProvider[];
  capabilities?: AiCapability[];
  temperature?: number;
  safetyBudget?: {
    maxOutputTokens?: number;
    maxLatencyMs?: number;
    maxRetries?: number;
  };
  modelHints?: Partial<Record<AiProvider, string>>;
}

export interface AiGatewayResponse<T = unknown> {
  provider: AiProvider;
  output: string;
  parsed?: T;
  latencyMs: number;
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
  };
}

interface ProviderConfig {
  available: boolean;
  capabilities: AiCapability[];
  defaultModel?: string;
}

interface ProviderHealthState {
  consecutiveFailures: number;
  unhealthyUntil: number;
  lastError?: string;
  lastLatencyMs?: number;
}

const geminiKey =
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

const geminiClient = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const openaiClient = (() => {
  try {
    return getOpenAI();
  } catch (error) {
    console.error('[ai-gateway] Failed to bootstrap OpenAI client', error);
    return null;
  }
})();

const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL;

const providerConfigs: Record<AiProvider, ProviderConfig> = {
  gemini: {
    available: Boolean(geminiClient),
    capabilities: ['json', 'long-context', 'low-latency'],
    defaultModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
  },
  openai: {
    available: Boolean(openaiClient?.chat?.completions),
    capabilities: ['json', 'long-context'],
    defaultModel: process.env.OPENAI_CONVERSATION_MODEL || OPENAI_MODEL,
  },
  local: {
    available: Boolean(LOCAL_LLM_URL),
    capabilities: ['json'],
  },
};

const providerHealth: Record<AiProvider, ProviderHealthState> = {
  gemini: { consecutiveFailures: 0, unhealthyUntil: 0 },
  openai: { consecutiveFailures: 0, unhealthyUntil: 0 },
  local: { consecutiveFailures: 0, unhealthyUntil: 0 },
};

interface ProviderMetrics {
  requests: number;
  failures: number;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number[];
}

interface TotalMetrics {
  requests: number;
  failures: number;
}

const createProviderMetrics = (): ProviderMetrics => ({
  requests: 0,
  failures: 0,
  tokensIn: 0,
  tokensOut: 0,
  latencyMs: [],
});

const aiGatewayMetrics: { total: TotalMetrics } & Record<AiProvider, ProviderMetrics> = {
  total: { requests: 0, failures: 0 },
  gemini: createProviderMetrics(),
  openai: createProviderMetrics(),
  local: createProviderMetrics(),
};

export const TextResponseSchema = z.object({
  text: z.string().min(1).max(600),
});

export async function routePrompt<T = unknown>(
  request: AiGatewayRequest
): Promise<AiGatewayResponse<T>> {
  const candidates = selectProviders(request);
  const maxRetries = request.safetyBudget?.maxRetries ?? candidates.length;

  for (const provider of candidates.slice(0, maxRetries)) {
    if (!providerConfigs[provider]?.available) {
      continue;
    }

    if (!isProviderHealthy(provider)) {
      continue;
    }

    if (!providerSupports(provider, request.capabilities)) {
      continue;
    }

    try {
      const start = Date.now();
      const invocation = invokeProvider(provider, request);
      const result = request.safetyBudget?.maxLatencyMs
        ? await withTimeout(invocation, request.safetyBudget.maxLatencyMs)
        : await invocation;
      const latencyMs = Date.now() - start;

      const parsed = request.responseSchema
        ? validateResponse(request.responseSchema, result.output)
        : undefined;

      recordSuccess(provider, latencyMs, result.tokens);
      logEvent({
        level: 'info',
        event: 'ai_gateway.success',
        provider,
        latencyMs,
        tokens: result.tokens,
        useCase: request.metadata?.useCase,
      });

      return {
        provider,
        output: result.output,
        parsed: parsed as T,
        latencyMs,
        tokens: result.tokens,
      };
    } catch (error) {
      recordFailure(provider, error as Error);
      logEvent({
        level: 'error',
        event: 'ai_gateway.failure',
        provider,
        message: (error as Error).message,
        useCase: request.metadata?.useCase,
      });
    }
  }

  aiGatewayMetrics.total.failures += 1;
  throw new Error('AI gateway exhausted all providers');
}

export function getAiGatewayMetricsSnapshot() {
  return JSON.parse(JSON.stringify(aiGatewayMetrics));
}

function selectProviders(request: AiGatewayRequest): AiProvider[] {
  if (request.preferredProviders?.length) {
    return request.preferredProviders;
  }
  return ['openai', 'gemini', 'local'];
}

function isProviderHealthy(provider: AiProvider) {
  const state = providerHealth[provider];
  if (!state) return false;
  if (state.unhealthyUntil && Date.now() < state.unhealthyUntil) {
    return false;
  }
  return true;
}

function providerSupports(provider: AiProvider, required?: AiCapability[]) {
  if (!required || required.length === 0) return true;
  const supported = providerConfigs[provider]?.capabilities || [];
  return required.every(capability => supported.includes(capability));
}

async function invokeProvider(provider: AiProvider, request: AiGatewayRequest) {
  switch (provider) {
    case 'gemini':
      return callGemini(request);
    case 'openai':
      return callOpenAI(request);
    case 'local':
      return callLocalModel(request);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callGemini(request: AiGatewayRequest) {
  if (!geminiClient) {
    throw new Error('Gemini client unavailable');
  }

  const modelName = request.modelHints?.gemini || providerConfigs.gemini.defaultModel || 'gemini-1.5-flash-latest';
  const model = geminiClient.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: request.temperature ?? 0.4,
      maxOutputTokens: request.safetyBudget?.maxOutputTokens ?? 256,
    },
  });

  const result = await model.generateContent(request.prompt);
  const text = result.response.text().trim();
  const usage = result.response.usageMetadata;

  return {
    output: text,
    tokens: {
      input: usage?.promptTokenCount,
      output: usage?.candidatesTokenCount,
      total: usage?.totalTokenCount,
    },
  };
}

async function callOpenAI(request: AiGatewayRequest) {
  const openai = openaiClient || getOpenAI();
  if (!openai?.chat?.completions) {
    throw new Error('OpenAI chat client unavailable');
  }

  const modelName = request.modelHints?.openai || providerConfigs.openai.defaultModel || OPENAI_MODEL;
  const response = await openai.chat.completions.create({
    model: modelName,
    messages: [{ role: 'user', content: request.prompt }],
    temperature: request.temperature ?? 0.4,
    max_tokens: request.safetyBudget?.maxOutputTokens ?? 256,
  });

  return {
    output: response?.choices?.[0]?.message?.content?.trim() || '',
    tokens: {
      input: response?.usage?.prompt_tokens,
      output: response?.usage?.completion_tokens,
      total: response?.usage?.total_tokens,
    },
  };
}

async function callLocalModel(request: AiGatewayRequest) {
  if (!LOCAL_LLM_URL) {
    throw new Error('Local model endpoint not configured');
  }

  const response = await fetch(LOCAL_LLM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: request.prompt,
      max_tokens: request.safetyBudget?.maxOutputTokens ?? 256,
      temperature: request.temperature ?? 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`Local model error: ${response.status}`);
  }

  const payload = await response.json();
  const output = (payload.output || payload.text || payload.response || '').trim();

  return {
    output,
    tokens: {
      input: payload.tokens?.prompt,
      output: payload.tokens?.completion,
      total: payload.tokens?.total,
    },
  };
}

function validateResponse(schema: ZodSchema, rawOutput: string) {
  const parsedJson = tryParseJson(rawOutput);
  if (parsedJson === null) {
    throw new Error('LLM output was not valid JSON');
  }

  const result = schema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(`LLM output failed schema validation: ${result.error.message}`);
  }
  return result.data;
}

function tryParseJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    const match = payload.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('AI provider timed out'));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function recordSuccess(provider: AiProvider, latencyMs: number, tokens?: { input?: number; output?: number }) {
  aiGatewayMetrics.total.requests += 1;
  aiGatewayMetrics[provider].requests += 1;
  aiGatewayMetrics[provider].latencyMs.push(latencyMs);
  aiGatewayMetrics[provider].tokensIn += tokens?.input || 0;
  aiGatewayMetrics[provider].tokensOut += tokens?.output || 0;

  providerHealth[provider].consecutiveFailures = 0;
  providerHealth[provider].unhealthyUntil = 0;
  providerHealth[provider].lastLatencyMs = latencyMs;
  providerHealth[provider].lastError = undefined;
}

function recordFailure(provider: AiProvider, error: Error) {
  aiGatewayMetrics.total.requests += 1;
  aiGatewayMetrics.total.failures += 1;
  aiGatewayMetrics[provider].requests += 1;
  aiGatewayMetrics[provider].failures += 1;

  providerHealth[provider].consecutiveFailures += 1;
  providerHealth[provider].lastError = error.message;

  if (providerHealth[provider].consecutiveFailures >= 3) {
    providerHealth[provider].unhealthyUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
  }
}

function logEvent(event: Record<string, unknown>) {
  const payload = {
    timestamp: new Date().toISOString(),
    ...event,
  };
  console.log('[ai-gateway]', JSON.stringify(payload));
}

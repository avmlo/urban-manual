import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { URBAN_MANUAL_EDITOR_SYSTEM_PROMPT } from '@/lib/ai/systemPrompts';
import { withOptionalAuth, createSuccessResponse, OptionalAuthContext } from '@/lib/errors';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  enforceRateLimit,
} from '@/lib/rate-limit';

interface Intent {
  city?: string;
  category?: string;
  modifiers: string[];
  keywords: string[];
}

interface Context {
  city?: string;
  category?: string;
  meal?: string;
  cuisine?: string;
  mood?: string;
  price_level?: string;
  timezone: string;
  language: string;
  archetype_seed?: string;
  ip_hint?: string;
  intent?: Intent;
}

// Lightweight intent parsing (no dependency on client helpers)
async function parseIntentSafe(query: string): Promise<Intent> {
  const lower = (query || '').toLowerCase();
  const cityMatch = lower.match(/in ([a-z\-\s]+)/i);
  const categoryMatch = lower.match(/(restaurant|hotel|cafe|bar|gallery|museum|park)/i);
  const modifiers: string[] = [];
  const MODS = ['romantic','michelin','fine-dining','vegetarian','vegan','cozy','modern','quiet','buzzy'];
  for (const m of MODS) if (lower.includes(m)) modifiers.push(m);
  return {
    city: cityMatch ? cityMatch[1].trim() : undefined,
    category: categoryMatch ? categoryMatch[1] : undefined,
    modifiers,
    keywords: []
  };
}

function getClientHints(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '').split(',')[0].trim();
  const language = (req.headers.get('accept-language') || '').split(',')[0].toLowerCase() || 'en';
  const timezone =
    req.headers.get('x-vercel-ip-timezone') ||
    req.headers.get('cf-timezone') ||
    req.headers.get('x-timezone') ||
    'UTC';
  return { ip, language, timezone };
}

async function generateGreeting(context: Context): Promise<string> {
  try {
    const { generateJSON } = await import('@/lib/llm');
    const json = await generateJSON(
      URBAN_MANUAL_EDITOR_SYSTEM_PROMPT,
      `Create a 1-2 sentence warm greeting acknowledging the user's context.
Context: ${JSON.stringify(context)}
Constraints: concise, modern tone, end by inviting a follow-up.
Return only JSON: { "text": "..." }`
    );
    return json?.text || defaultGreeting(context);
  } catch {
    return defaultGreeting(context);
  }
}

function defaultGreeting(context: Context): string {
  const city = context.city ? `${context.city[0].toUpperCase()}${context.city.slice(1)}` : null;
  if (city) return `Got it. Welcome — let’s tune this for ${city}. What’s the vibe — lunch or dinner?`;
  return `Noted. I’ll tailor picks to your taste. Where are you exploring today?`;
}

function buildMicroSurveyOptions() {
  return [
    { key: 'mood', options: ['cozy', 'modern', 'romantic', 'buzzy'] },
    { key: 'cuisine', options: ['japanese', 'french', 'italian', 'local'] },
  ];
}

export const POST = withOptionalAuth(async (req: NextRequest, { user }: OptionalAuthContext) => {
  // 🛡️ Rate Limiting Strategy
  // Use conversation limit (5 req/10s) as this triggers expensive LLM calls
  // Fallback to IP-based limiting if user is not logged in
  const rateLimitResponse = await enforceRateLimit({
    request: req,
    userId: user?.id,
    message: 'Too many onboarding requests. Please try again in a moment.',
    limiter: conversationRatelimit,
    memoryLimiter: memoryConversationRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { firstMessage } = await req.json();
  const hints = getClientHints(req);

  const userId = user?.id;

  const intent = firstMessage ? await parseIntentSafe(firstMessage) : { modifiers: [], keywords: [] };

  const archetypeSeed = {
    language: hints.language,
    timezone: hints.timezone,
    vibe_seed: ['cozy', 'modern', 'romantic', 'buzzy'][Math.floor(Math.random() * 4)],
  };

  const sessionContext: Context = {
    city: intent.city,
    category: intent.category,
    meal: undefined,
    cuisine: undefined,
    mood: undefined,
    price_level: undefined,
    timezone: hints.timezone,
    language: hints.language,
    archetype_seed: archetypeSeed.vibe_seed,
    ip_hint: hints.ip || undefined,
  };

  // Best-effort store to Supabase conversation_sessions
  try {
    const admin = createServiceRoleClient();
    if (admin && userId) {
      await admin.from('conversation_sessions').upsert({
        user_id: userId,
        context: sessionContext,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }
  } catch (error) {
    // table may not exist yet; ignore
    console.warn('Failed to save session context:', error);
  }

  const greeting = await generateGreeting({ ...sessionContext, intent });
  const survey = buildMicroSurveyOptions();

  return createSuccessResponse({
    context: sessionContext,
    intent,
    greeting,
    survey,
  });
});

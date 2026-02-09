/**
 * Enhanced Circuit Breaker with Exponential Backoff
 *
 * Provides production-grade fault tolerance for external AI/API providers:
 * - Three states: CLOSED (healthy), OPEN (tripped), HALF_OPEN (probing)
 * - Exponential backoff with jitter for retries
 * - User-friendly fallback responses when all providers are down
 * - Per-provider tracking integrated with observability metrics
 */

import { recordProviderEvent } from "@/lib/observability/metrics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit. Default: 3 */
  failureThreshold?: number;
  /** Base cooldown in ms before transitioning to half-open. Default: 30_000 (30s) */
  cooldownMs?: number;
  /** Max cooldown cap in ms (for exponential growth). Default: 300_000 (5min) */
  maxCooldownMs?: number;
  /** Number of successes in half-open needed to close the circuit. Default: 2 */
  halfOpenSuccessThreshold?: number;
}

interface CircuitBreakerState {
  state: CircuitState;
  consecutiveFailures: number;
  consecutiveHalfOpenSuccesses: number;
  lastFailureAt: number;
  openUntil: number;
  /** Track how many times the circuit has opened (for exponential backoff) */
  tripCount: number;
}

// ---------------------------------------------------------------------------
// CircuitBreaker class
// ---------------------------------------------------------------------------

export class CircuitBreaker {
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly baseCooldownMs: number;
  private readonly maxCooldownMs: number;
  private readonly halfOpenSuccessThreshold: number;
  private _state: CircuitBreakerState;

  constructor(name: string, config: CircuitBreakerConfig = {}) {
    this.name = name;
    this.failureThreshold = config.failureThreshold ?? 3;
    this.baseCooldownMs = config.cooldownMs ?? 30_000;
    this.maxCooldownMs = config.maxCooldownMs ?? 300_000;
    this.halfOpenSuccessThreshold = config.halfOpenSuccessThreshold ?? 2;

    this._state = {
      state: "closed",
      consecutiveFailures: 0,
      consecutiveHalfOpenSuccesses: 0,
      lastFailureAt: 0,
      openUntil: 0,
      tripCount: 0,
    };
  }

  /** Current circuit state */
  get state(): CircuitState {
    // Auto-transition from open to half_open if cooldown has elapsed
    if (
      this._state.state === "open" &&
      Date.now() >= this._state.openUntil
    ) {
      this._state.state = "half_open";
      this._state.consecutiveHalfOpenSuccesses = 0;
    }
    return this._state.state;
  }

  /** Whether the circuit allows requests through */
  get isAllowed(): boolean {
    const currentState = this.state; // triggers auto-transition
    return currentState !== "open";
  }

  /** Record a successful call */
  recordSuccess(latencyMs?: number): void {
    recordProviderEvent(this.name, { success: true, latencyMs });

    if (this._state.state === "half_open") {
      this._state.consecutiveHalfOpenSuccesses++;
      if (
        this._state.consecutiveHalfOpenSuccesses >=
        this.halfOpenSuccessThreshold
      ) {
        // Close the circuit
        this._state.state = "closed";
        this._state.consecutiveFailures = 0;
        this._state.tripCount = 0;
        console.log(
          `[circuit-breaker] ${this.name}: HALF_OPEN -> CLOSED (recovered)`
        );
      }
    } else {
      // Reset failure count on success in closed state
      this._state.consecutiveFailures = 0;
    }
  }

  /** Record a failed call */
  recordFailure(error?: Error): void {
    recordProviderEvent(this.name, { success: false });
    this._state.lastFailureAt = Date.now();
    this._state.consecutiveFailures++;

    if (this._state.state === "half_open") {
      // Failure during probe -> re-open with increased backoff
      this.tripCircuit();
      console.log(
        `[circuit-breaker] ${this.name}: HALF_OPEN -> OPEN (probe failed: ${error?.message})`
      );
    } else if (
      this._state.consecutiveFailures >= this.failureThreshold
    ) {
      this.tripCircuit();
      console.log(
        `[circuit-breaker] ${this.name}: CLOSED -> OPEN (${this._state.consecutiveFailures} failures)`
      );
    }
  }

  private tripCircuit(): void {
    this._state.tripCount++;
    // Exponential backoff with jitter
    const backoff = Math.min(
      this.baseCooldownMs * Math.pow(2, this._state.tripCount - 1),
      this.maxCooldownMs
    );
    const jitter = backoff * 0.2 * Math.random();
    const cooldown = backoff + jitter;

    this._state.state = "open";
    this._state.openUntil = Date.now() + cooldown;
    this._state.consecutiveHalfOpenSuccesses = 0;

    recordProviderEvent(this.name, {
      success: false,
      circuitBreak: true,
    });

    console.log(
      `[circuit-breaker] ${this.name}: circuit open for ${Math.round(cooldown / 1000)}s (trip #${this._state.tripCount})`
    );
  }

  /** Get diagnostic info */
  getStatus(): {
    name: string;
    state: CircuitState;
    consecutiveFailures: number;
    tripCount: number;
    openUntil: number | null;
  } {
    return {
      name: this.name,
      state: this.state,
      consecutiveFailures: this._state.consecutiveFailures,
      tripCount: this._state.tripCount,
      openUntil:
        this._state.state === "open" ? this._state.openUntil : null,
    };
  }
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------

export interface RetryConfig {
  /** Max number of retry attempts. Default: 3 */
  maxRetries?: number;
  /** Base delay in ms. Default: 500 */
  baseDelayMs?: number;
  /** Maximum delay cap in ms. Default: 10_000 */
  maxDelayMs?: number;
  /** Whether to add random jitter. Default: true */
  jitter?: boolean;
}

/**
 * Execute a function with exponential backoff retries.
 * Respects the circuit breaker if provided.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  breaker?: CircuitBreaker
): Promise<T> {
  const maxRetries = config.maxRetries ?? 3;
  const baseDelay = config.baseDelayMs ?? 500;
  const maxDelay = config.maxDelayMs ?? 10_000;
  const useJitter = config.jitter ?? true;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check circuit breaker before each attempt
    if (breaker && !breaker.isAllowed) {
      throw new Error(
        `Circuit breaker ${breaker.getStatus().name} is open — request not attempted`
      );
    }

    try {
      const start = Date.now();
      const result = await fn();
      breaker?.recordSuccess(Date.now() - start);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      breaker?.recordFailure(lastError);

      if (attempt < maxRetries) {
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt),
          maxDelay
        );
        const jitter = useJitter ? delay * 0.3 * Math.random() : 0;
        await new Promise((resolve) =>
          setTimeout(resolve, delay + jitter)
        );
      }
    }
  }

  throw lastError ?? new Error("withRetry exhausted all attempts");
}

// ---------------------------------------------------------------------------
// AI fallback responses
// ---------------------------------------------------------------------------

/**
 * Generate a user-friendly fallback response when all AI providers are down.
 */
export function getAIFallbackResponse(context: {
  query?: string;
  city?: string;
  category?: string;
  resultCount?: number;
}): string {
  const { query, city, category, resultCount = 0 } = context;

  if (resultCount > 0) {
    const location = city ? ` in ${city}` : "";
    const categoryText = category ? ` ${category.toLowerCase()}` : "";
    return `Here are ${resultCount}${categoryText} results${location} matching your search. Our AI assistant is temporarily unavailable for personalized recommendations, but you can browse these results directly.`;
  }

  if (city) {
    return `We're currently experiencing issues with our recommendation engine, but you can browse all destinations in ${city} using the filters above. Try searching by category or using the map view.`;
  }

  return "Our AI assistant is temporarily unavailable. You can still browse destinations using the search filters, explore cities on the map, or check out our trending destinations.";
}

/**
 * Generate a fallback search response with static data when all search
 * providers (Discovery Engine + Vector + Keyword) fail.
 */
export function getSearchFallbackResponse(): {
  content: string;
  destinations: never[];
  searchTier: string;
  fallback: true;
} {
  return {
    content:
      "We're having trouble connecting to our search service right now. Please try again in a moment, or browse destinations by city using the navigation above.",
    destinations: [],
    searchTier: "fallback",
    fallback: true,
  };
}

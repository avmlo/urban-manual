/**
 * Feature Flags
 *
 * Simple feature flag utility for enabling/disabling features.
 * Uses environment variables for configuration.
 *
 * Usage:
 *   if (isFeatureEnabled('tripCanvasEditor')) { ... }
 *   if (useFeatureFlag('tripCanvasEditor', false)) { ... }
 */

/**
 * Feature flag definitions
 */
export interface FeatureFlagConfig {
  /**
   * TripCanvas - New timeline-based trip editor with inspector panel
   * Default: false (behind feature flag)
   */
  tripCanvasEditor: boolean;

  /**
   * Batched updates for trip reordering
   * Default: true (enabled)
   */
  batchedReorderUpdates: boolean;

  /**
   * Use server-side weather API instead of client-side Open-Meteo
   * Default: true (enabled)
   */
  serverSideWeather: boolean;

  /**
   * New unified trip model (shared between builder and editor)
   * Default: false (in development)
   */
  unifiedTripModel: boolean;

  /**
   * Simplified hero variant for A/B testing
   * When true, shows the streamlined hero with single headline + CTAs
   * Default: false (control = current hero behavior)
   */
  simplifiedHero: boolean;
}

/**
 * Default feature flag values
 */
const defaultFlags: FeatureFlagConfig = {
  tripCanvasEditor: false,
  batchedReorderUpdates: true,
  serverSideWeather: true,
  unifiedTripModel: false,
  simplifiedHero: false,
};

/**
 * Environment variable mapping
 */
const envVarMapping: Record<keyof FeatureFlagConfig, string> = {
  tripCanvasEditor: 'NEXT_PUBLIC_FEATURE_TRIP_CANVAS',
  batchedReorderUpdates: 'NEXT_PUBLIC_FEATURE_BATCHED_REORDER',
  serverSideWeather: 'NEXT_PUBLIC_FEATURE_SERVER_WEATHER',
  unifiedTripModel: 'NEXT_PUBLIC_FEATURE_UNIFIED_TRIP_MODEL',
  simplifiedHero: 'NEXT_PUBLIC_FEATURE_SIMPLIFIED_HERO',
};

/**
 * Get all feature flags
 */
export function getFeatureFlags(): FeatureFlagConfig {
  const flags = { ...defaultFlags };

  for (const [key, envVar] of Object.entries(envVarMapping)) {
    const envValue = process.env[envVar];
    if (envValue !== undefined) {
      flags[key as keyof FeatureFlagConfig] = envValue === 'true';
    }
  }

  return flags;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlagConfig): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * Use a feature flag with a fallback default value
 */
export function useFeatureFlag(
  feature: keyof FeatureFlagConfig,
  defaultValue?: boolean
): boolean {
  try {
    return isFeatureEnabled(feature);
  } catch {
    return defaultValue ?? defaultFlags[feature];
  }
}

/**
 * Hook for client-side feature flag usage
 * Note: This is a simple sync check - flags are read at build time
 */
export function useTripCanvasEditor(): boolean {
  return isFeatureEnabled('tripCanvasEditor');
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Enable a feature flag for development/testing
 * Use via: NEXT_PUBLIC_FEATURE_TRIP_CANVAS=true npm run dev
 */
export function logFeatureFlags(): void {
  if (isDevelopment()) {
    console.log('Feature Flags:', getFeatureFlags());
  }
}

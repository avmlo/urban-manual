/**
 * Feature flag and A/B testing utilities for Discovery Engine
 */

export interface ABTestConfig {
  name: string;
  enabled: boolean;
  variants: {
    name: string;
    weight: number; // 0-1, sum should be 1
  }[];
}

export interface FeatureFlags {
  useDiscoveryEngine: boolean;
  useConversationalSearch: boolean;
  useMultimodalSearch: boolean;
  useNaturalLanguageFilters: boolean;
  enablePersonalization: boolean;
  enableContextualRecommendations: boolean;
  abTests: ABTestConfig[];
}

/**
 * Get feature flags from environment variables
 */
export function getFeatureFlags(): FeatureFlags {
  const useDiscoveryEngine = process.env.USE_DISCOVERY_ENGINE === 'true';
  const useConversationalSearch = process.env.USE_CONVERSATIONAL_SEARCH === 'true';
  const useMultimodalSearch = process.env.USE_MULTIMODAL_SEARCH === 'true';
  const useNaturalLanguageFilters = process.env.USE_NATURAL_LANGUAGE_FILTERS === 'true';
  const enablePersonalization = process.env.ENABLE_DISCOVERY_PERSONALIZATION !== 'false'; // Default true
  const enableContextualRecommendations = process.env.ENABLE_CONTEXTUAL_RECOMMENDATIONS !== 'false'; // Default true

  // A/B test configurations
  const abTests: ABTestConfig[] = [];

  // Search quality A/B test
  if (process.env.AB_TEST_SEARCH_QUALITY === 'true') {
    abTests.push({
      name: 'search_quality',
      enabled: true,
      variants: [
        { name: 'discovery_engine', weight: 0.5 },
        { name: 'supabase', weight: 0.5 },
      ],
    });
  }

  return {
    useDiscoveryEngine,
    useConversationalSearch,
    useMultimodalSearch,
    useNaturalLanguageFilters,
    enablePersonalization,
    enableContextualRecommendations,
    abTests,
  };
}

/**
 * Get variant for a user in an A/B test
 */
export function getABTestVariant(userId: string, testName: string): string | null {
  const flags = getFeatureFlags();
  const test = flags.abTests.find((t) => t.name === testName && t.enabled);

  if (!test) {
    return null;
  }

  // Deterministic variant assignment based on user ID
  const hash = simpleHash(userId + testName);
  const random = hash % 100 / 100;

  let cumulative = 0;
  for (const variant of test.variants) {
    cumulative += variant.weight;
    if (random < cumulative) {
      return variant.name;
    }
  }

  // Fallback to first variant
  return test.variants[0]?.name || null;
}

/**
 * Simple hash function for deterministic variant assignment
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature] === true;
}

/**
 * Get A/B test assignment for a user
 */
export function getABTestAssignment(userId: string): { [testName: string]: string } {
  const flags = getFeatureFlags();
  const assignments: { [testName: string]: string } = {};

  flags.abTests.forEach((test) => {
    if (test.enabled) {
      const variant = getABTestVariant(userId, test.name);
      if (variant) {
        assignments[test.name] = variant;
      }
    }
  });

  return assignments;
}


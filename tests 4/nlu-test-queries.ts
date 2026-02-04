import { analyzeIntent } from '../lib/ai/intent-analysis';

export const TEST_QUERIES = {
  vague: [
    'somewhere chill',
    'hidden gem in tokyo',
    'unique spot',
    'place with good vibes',
    'something different',
  ],

  comparative: [
    'like Narisawa but more affordable',
    'similar vibe to Blue Bottle',
    'better than that touristy ramen place',
    'cheaper version of this',
  ],

  multi_criteria: [
    'affordable but still nice for a date',
    'fancy but not pretentious',
    'authentic but English-friendly',
    'quick but quality',
    'casual but good food',
  ],

  temporal: [
    'best for cherry blossom season',
    'good for rainy days',
    'open late after theater',
    'Sunday brunch spot',
    'midnight snack',
  ],

  social: [
    'good for group of 8',
    'kid-friendly but adults enjoy too',
    'solo traveler friendly',
    'first date spot',
    'anniversary dinner',
    'business lunch',
  ],

  activity: [
    'coffee before museum',
    'dinner after concert',
    'lunch break from shopping',
    'post-workout smoothie',
  ],

  mood: [
    'feeling adventurous',
    'need comfort food',
    'want to feel fancy tonight',
    'looking for energy not quiet',
    'need to impress someone',
    'treat myself',
  ],

  discovery: [
    'where locals actually go',
    'off the beaten path',
    'not tourist traps',
    'show me something I wouldn\'t find',
    'authentic local experience',
  ],

  budget: [
    'under 5000 yen per person',
    'won\'t break the bank',
    'splurge-worthy',
    'worth the money',
    'cheap eats',
    'best value',
  ],

  dietary: [
    'vegan options that aren\'t salad',
    'vegetarian-friendly izakaya',
    'gluten-free friendly',
    'halal options',
    'nut allergy safe',
  ],

  complex: [
    'cozy italian spot for rainy day date under 8000 yen',
    'lively izakaya where locals go good for group of 6',
    'minimalist coffee shop to work from with good wifi in shibuya',
    'fancy omakase for anniversary but not too formal',
    'authentic ramen not touristy open late near shibuya',
  ],
};

// Test runner
export async function testNLU() {
  const results: Array<{
    query: string;
    category: string;
    confidence?: number;
    success: boolean;
    error?: string;
  }> = [];

  for (const [category, queries] of Object.entries(TEST_QUERIES)) {
    console.log(`\n=== Testing ${category} queries ===\n`);

    for (const query of queries) {
      try {
        const result = await analyzeIntent(query, {
          savedPlaces: [],
          recentVisits: [],
          tasteProfile: { taste_archetype: 'minimalist' },
        });

        console.log(`Query: "${query}"`);
        console.log(`Confidence: ${result.confidence}`);
        console.log(`Intent: ${result.intent}`);
        console.log(`Semantic: ${result.interpretations[0]?.semanticQuery || 'N/A'}`);
        console.log(`Reasoning: ${result.reasoning || 'N/A'}\n`);

        results.push({
          query,
          category,
          confidence: result.confidence,
          success: result.confidence > 0.5,
        });
      } catch (err: any) {
        console.error(`Failed: ${query}`, err.message);
        results.push({
          query,
          category,
          success: false,
          error: err.message,
        });
      }
    }
  }

  // Summary
  const successCount = results.filter(r => r.success).length;
  const successRate = successCount / results.length;
  console.log(`\n=== Overall Success Rate: ${(successRate * 100).toFixed(1)}% ===`);
  console.log(`Passed: ${successCount}/${results.length}`);

  return results;
}

// Run tests if called directly
if (require.main === module) {
  testNLU().catch(console.error);
}


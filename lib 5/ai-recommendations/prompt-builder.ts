import { UserBehaviorProfile } from './profile-extractor';
import { Destination } from '@/types/destination';

export function buildScoringPrompt(
  profile: UserBehaviorProfile,
  candidates: Destination[]
): string {
  // Build concise user profile summary
  const profileSummary = buildProfileSummary(profile);
  
  // Build candidate list
  const candidateList = candidates.map((dest, idx) => 
    `${idx}|${dest.name}|${dest.category}|${dest.city}|${dest.country || 'Unknown'}|${dest.price_level || 'N/A'}|${dest.rating || 'N/A'}|${dest.michelin_stars || 0}|${((dest.content || '') as string).substring(0, 100)}`
  ).join('\n');
  
  return `You are a travel recommendation AI for The Urban Manual, a curated guide to the world's best destinations.

Your task: Score ${candidates.length} destinations for a user based on their preferences and behavior.

USER PROFILE:

${profileSummary}

DESTINATIONS TO SCORE:

Format: Index|Name|Category|City|Country|Price|Rating|Michelin|Description

${candidateList}

SCORING CRITERIA:

1. City Match (40%): HEAVILY prefer destinations in user's FOLLOWED cities (explicit interest). Also prefer favorite and frequently visited cities.

2. Category Match (25%): Prefer user's favorite categories

3. Price Match (15%): Match user's typical price range (±1 level acceptable)

4. Quality Match (15%): Match user's rating/Michelin preferences

5. Novelty (10%): Introduce new but similar destinations

6. Recency (5%): Consider recent searches and interests

INSTRUCTIONS:

- Score each destination from 0.0 to 1.0 (1.0 = perfect match)

- Provide a brief, specific reason (max 10 words)

- Focus on WHY it matches the user's preferences

- Be honest: low scores for poor matches are okay

- Consider the full context, not just one factor

OUTPUT FORMAT (JSON):

[
  {
    "index": 0,
    "score": 0.87,
    "reason": "Luxury hotel in favorite city Tokyo"
  },
  {
    "index": 1,
    "score": 0.65,
    "reason": "Similar to saved Michelin restaurants"
  }
]

Return ONLY the JSON array, no additional text.`;
}

function buildProfileSummary(profile: UserBehaviorProfile): string {
  const parts: string[] = [];
  
  // Explicit preferences
  if (profile.followedCities.length > 0) {
    parts.push(`FOLLOWED CITIES (HIGHEST PRIORITY): ${profile.followedCities.join(', ')}`);
  }
  
  if (profile.favoriteCities.length > 0) {
    parts.push(`Favorite Cities: ${profile.favoriteCities.join(', ')}`);
  }
  
  if (profile.favoriteCategories.length > 0) {
    parts.push(`Favorite Categories: ${profile.favoriteCategories.join(', ')}`);
  }
  
  parts.push(`Travel Style: ${profile.travelStyle}`);
  parts.push(`Price Preference: ${'$'.repeat(profile.pricePreference)} (${profile.pricePreference}/4)`);
  
  if (profile.dietaryPreferences.length > 0) {
    parts.push(`Dietary: ${profile.dietaryPreferences.join(', ')}`);
  }
  
  if (profile.interests.length > 0) {
    parts.push(`Interests: ${profile.interests.join(', ')}`);
  }
  
  // Behavioral patterns
  if (profile.topVisitedCities.length > 0) {
    const cities = profile.topVisitedCities.slice(0, 3).map(c => `${c.city} (${c.count}x)`).join(', ');
    parts.push(`Most Visited: ${cities}`);
  }
  
  if (profile.topSavedCategories.length > 0) {
    const cats = profile.topSavedCategories.slice(0, 3).map(c => `${c.category} (${c.count})`).join(', ');
    parts.push(`Most Saved: ${cats}`);
  }
  
  parts.push(`Avg Price Level: ${'$'.repeat(Math.round(profile.avgPriceLevel))}`);
  parts.push(`Avg Rating: ${profile.avgRating.toFixed(1)}/5.0`);
  
  if (profile.michelinPreference > 0.2) {
    parts.push(`Michelin Interest: ${(profile.michelinPreference * 100).toFixed(0)}% of saves`);
  }
  
  // Recent activity
  if (profile.recentSearches.length > 0) {
    parts.push(`Recent Searches: ${profile.recentSearches.slice(0, 3).join(', ')}`);
  }
  
  if (profile.recentlySaved.length > 0) {
    const recent = profile.recentlySaved.slice(0, 3).map(d => `${d.name} (${d.city})`).join(', ');
    parts.push(`Recently Saved: ${recent}`);
  }
  
  // Stats
  parts.push(`Stats: ${profile.totalSaved} saved, ${profile.totalViews} viewed, ${profile.accountAge} days active`);
  
  return parts.join('\n');
}


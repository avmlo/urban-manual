/**
 * Generative Personalization for Discovery Prompts
 * Uses LLMs to compose custom prompts blending factual and emotional data
 * Example: "Alexander, your saved hotels in Kyoto are near Philosopher's Path — it blooms beautifully this April."
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { DiscoveryPrompt } from '@/types/discovery';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
// Support both new (publishable/secret) and legacy (anon/service_role) key naming
const SUPABASE_KEY = 
  process.env.SUPABASE_SECRET_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!GOOGLE_API_KEY) {
  console.warn('Missing GOOGLE_API_KEY for generative personalization');
}

const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;
const supabase = SUPABASE_URL && SUPABASE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

export interface GenerativePromptContext {
  userId?: string;
  userName?: string;
  city: string;
  savedDestinations?: Array<{
    name: string;
    city: string;
    category?: string;
    notes?: string;
  }>;
  visitedDestinations?: Array<{
    name: string;
    city: string;
    category?: string;
  }>;
  preferences?: {
    favorite_cities?: string[];
    favorite_categories?: string[];
    travel_style?: string;
  };
  currentPrompts?: DiscoveryPrompt[];
}

export interface CrossCityCorrelation {
  sourceCity: string;
  sourceExperience: string; // e.g., "cherry blossoms"
  targetCity: string;
  targetExperience: string; // e.g., "jacaranda season"
  month: number; // 1-12
  correlation_strength: number; // 0-1
  prompt: string;
}

/**
 * Generate personalized discovery prompt using LLM
 */
export async function generatePersonalizedPrompt(
  context: GenerativePromptContext
): Promise<string | null> {
  if (!genAI || !supabase) {
    console.warn('Generative AI or Supabase not configured');
    return null;
  }

  try {
    // Fetch user data if userId provided
    let userData: GenerativePromptContext = { ...context };
    
    if (context.userId && supabase) {
      // Get saved destinations
      const { data: saved } = await supabase
        .from('saved_places')
        .select(`
          destination_slug,
          destination:destinations!inner (
            name,
            city,
            category
          ),
          notes
        `)
        .eq('user_id', context.userId)
        .limit(10);

      if (saved) {
        userData.savedDestinations = saved.map((s: any) => ({
          name: s.destination?.name || '',
          city: s.destination?.city || '',
          category: s.destination?.category,
          notes: s.notes || undefined,
        }));
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('display_name, favorite_cities, favorite_categories, travel_style')
        .eq('user_id', context.userId)
        .maybeSingle();

      if (profileError) {
        console.warn('generatePersonalizedPrompt: profile lookup failed', profileError.message);
      }

      if (profile) {
        userData.userName = profile.display_name || context.userName;
        userData.preferences = {
          favorite_cities: profile.favorite_cities || [],
          favorite_categories: profile.favorite_categories || [],
          travel_style: profile.travel_style || undefined,
        };
      }
    }

    // Build prompt for LLM
    const prompt = buildPersonalizationPrompt(userData);

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.7, // More creative for personalized prompts
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 200,
      }
    });

    const result = await model.generateContent(prompt);
    const generatedText = result.response.text().trim();

    return generatedText || null;
  } catch (error) {
    console.error('Error generating personalized prompt:', error);
    return null;
  }
}

function buildPersonalizationPrompt(context: GenerativePromptContext): string {
  const { userName, city, savedDestinations, preferences, currentPrompts } = context;

  let prompt = `You are a travel guide AI assistant. Generate a personalized, conversational discovery prompt for a user browsing ${city}.\n\n`;

  if (userName) {
    prompt += `User's name: ${userName}\n`;
  }

  if (savedDestinations && savedDestinations.length > 0) {
    const citySaved = savedDestinations.filter(d => d.city.toLowerCase() === city.toLowerCase());
    if (citySaved.length > 0) {
      prompt += `\nUser has saved places in ${city}:\n`;
      citySaved.slice(0, 3).forEach(dest => {
        prompt += `- ${dest.name}${dest.category ? ` (${dest.category})` : ''}${dest.notes ? ` - Note: ${dest.notes}` : ''}\n`;
      });
      prompt += `\nConnect these saved places to relevant seasonal/time-sensitive experiences in ${city}.\n`;
    }
  }

  if (preferences?.favorite_cities && preferences.favorite_cities.length > 0) {
    prompt += `\nUser's favorite cities: ${preferences.favorite_cities.join(', ')}\n`;
  }

  if (preferences?.favorite_categories && preferences.favorite_categories.length > 0) {
    prompt += `\nUser's favorite categories: ${preferences.favorite_categories.join(', ')}\n`;
  }

  if (currentPrompts && currentPrompts.length > 0) {
    prompt += `\nCurrent time-sensitive prompts for ${city}:\n`;
    currentPrompts.slice(0, 3).forEach(p => {
      prompt += `- ${p.title}: ${p.prompt_text}\n`;
    });
    prompt += `\nIncorporate these into the personalized message.\n`;
  }

  prompt += `\nGenerate a personalized, natural-sounding prompt (1-2 sentences max) that:
1. Addresses the user by name if available
2. References their saved places in ${city} if relevant
3. Mentions a seasonal/time-sensitive experience happening now or soon
4. Includes a specific recommendation or action
5. Feels conversational and friendly, not robotic

Example format: "${userName || 'Your'} saved hotels in ${city} are near [landmark] — it [seasonal event] this [month/time]."

Generate the prompt now:`;

  return prompt;
}

/**
 * Generate cross-city correlation prompts
 * Example: "Loved cherry blossoms in Tokyo? Try jacaranda season in Lisbon this May."
 */
export async function generateCrossCityCorrelations(
  userId: string,
  city: string
): Promise<CrossCityCorrelation[]> {
  if (!genAI || !supabase) {
    return [];
  }

  try {
    // Get user's visited/saved destinations
    const { data: saved } = await supabase
      .from('saved_places')
      .select(`
        destination_slug,
        destination:destinations!inner (
          name,
          city,
          category
        )
      `)
      .eq('user_id', userId);

    // Get current prompts for visited cities
    const visitedCities = Array.from(
      new Set(saved?.filter((s: any) => s.visited).map((s: any) => s.destination?.city).filter(Boolean) || [])
    ) as string[];

    if (visitedCities.length === 0) {
      return [];
    }

    // For each visited city, find similar experiences in other cities
    const correlations: CrossCityCorrelation[] = [];

    for (const visitedCity of visitedCities.slice(0, 5)) {
      if (visitedCity.toLowerCase() === city.toLowerCase()) {
        continue; // Skip current city
      }

      // Get prompts for visited city
      const { data: visitedPrompts } = await supabase.rpc('get_active_prompts_for_city', {
        p_city: visitedCity.toLowerCase(),
        p_date: new Date().toISOString().split('T')[0],
      });

      if (!visitedPrompts || visitedPrompts.length === 0) {
        continue;
      }

      // Get prompts for target city
      const { data: targetPrompts } = await supabase.rpc('get_active_prompts_for_city', {
        p_city: city.toLowerCase(),
        p_date: new Date().toISOString().split('T')[0],
      });

      if (!targetPrompts || targetPrompts.length === 0) {
        continue;
      }

      // Use AI to find correlations
      const correlation = await findCorrelationWithAI(
        visitedCity,
        visitedPrompts[0],
        city,
        targetPrompts[0]
      );

      if (correlation) {
        correlations.push(correlation);
      }
    }

    return correlations.sort((a, b) => b.correlation_strength - a.correlation_strength);
  } catch (error) {
    console.error('Error generating cross-city correlations:', error);
    return [];
  }
}

async function findCorrelationWithAI(
  sourceCity: string,
  sourcePrompt: any,
  targetCity: string,
  targetPrompt: any
): Promise<CrossCityCorrelation | null> {
  if (!genAI) return null;

  try {
    const prompt = `You are a travel recommendation AI. Find a meaningful connection between two seasonal experiences:

SOURCE: ${sourceCity}
Experience: ${sourcePrompt.title}
Details: ${sourcePrompt.prompt_text}

TARGET: ${targetCity}
Experience: ${targetPrompt.title}
Details: ${targetPrompt.prompt_text}

Generate a cross-city correlation prompt that suggests trying the target experience if they loved the source experience. The prompt should:
1. Be conversational and friendly
2. Reference the source experience explicitly
3. Connect it to the target experience
4. Mention the best time/season

Format as JSON:
{
  "sourceExperience": "brief description",
  "targetExperience": "brief description",
  "month": number (1-12),
  "correlation_strength": number (0-1),
  "prompt": "full prompt text"
}

Example: "Loved cherry blossoms in Tokyo? Try jacaranda season in Lisbon this May."

Respond with JSON only:`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 300,
      }
    });

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const correlation = JSON.parse(jsonMatch[0]);
    
    return {
      sourceCity,
      sourceExperience: correlation.sourceExperience,
      targetCity,
      targetExperience: correlation.targetExperience,
      month: correlation.month,
      correlation_strength: correlation.correlation_strength,
      prompt: correlation.prompt,
    };
  } catch (error) {
    console.error('Error finding correlation with AI:', error);
    return null;
  }
}

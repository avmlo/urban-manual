/**
 * Rewrite description and content using existing editorial_summary data
 * Usage: npm run rewrite:about
 * 
 * This script:
 * 1. Fetches all destinations that have editorial_summary
 * 2. Directly calls the regeneration logic (no HTTP needed)
 * 3. Rewrites both description and content based on editorial_summary + Google Places data
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function rewriteAboutForDestination(dest: any): Promise<{ ok: boolean; error?: string }> {
  try {
    // Fetch all Google Places data for this destination
    // Start with basic fields that definitely exist
    const { data: placeData, error: fetchError } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', dest.slug)
      .single();

    if (fetchError || !placeData) {
      return { ok: false, error: `Failed to fetch destination data: ${fetchError?.message || 'Not found'}` };
    }

    // Parse JSON fields (handle missing columns gracefully)
    const openingHours = placeData.opening_hours_json 
      ? (typeof placeData.opening_hours_json === 'string' ? JSON.parse(placeData.opening_hours_json) : placeData.opening_hours_json)
      : null;

    const currentOpeningHours = placeData.current_opening_hours_json 
      ? (typeof placeData.current_opening_hours_json === 'string' ? JSON.parse(placeData.current_opening_hours_json) : placeData.current_opening_hours_json)
      : null;

    const secondaryOpeningHours = placeData.secondary_opening_hours_json 
      ? (typeof placeData.secondary_opening_hours_json === 'string' ? JSON.parse(placeData.secondary_opening_hours_json) : placeData.secondary_opening_hours_json)
      : null;

    const placeTypes = placeData.place_types_json 
      ? (typeof placeData.place_types_json === 'string' ? JSON.parse(placeData.place_types_json) : placeData.place_types_json)
      : null;

    const reviews = placeData.reviews_json 
      ? (typeof placeData.reviews_json === 'string' ? JSON.parse(placeData.reviews_json) : placeData.reviews_json)
      : null;

    const addressComponents = placeData.address_components_json 
      ? (typeof placeData.address_components_json === 'string' ? JSON.parse(placeData.address_components_json) : placeData.address_components_json)
      : null;

    const placeDataForPrompt = {
      name: placeData.name,
      city: placeData.city,
      category: placeData.category,
      michelin_stars: placeData.michelin_stars,
      google_name: placeData.google_name,
      formatted_address: placeData.formatted_address,
      vicinity: placeData.vicinity,
      address_components: addressComponents,
      phone: placeData.international_phone_number,
      website: placeData.website,
      rating: placeData.rating,
      review_count: placeData.user_ratings_total,
      price_level: placeData.price_level,
      business_status: placeData.business_status,
      place_types: placeTypes,
      opening_hours: openingHours,
      current_opening_hours: currentOpeningHours,
      secondary_opening_hours: secondaryOpeningHours,
      timezone: placeData.timezone_id,
      utc_offset: placeData.utc_offset,
      coordinates: placeData.latitude && placeData.longitude ? { lat: placeData.latitude, lng: placeData.longitude } : null,
      plus_code: placeData.plus_code,
      reviews: Array.isArray(reviews) ? reviews.slice(0, 3) : [],
    };

    const prompt = `You are writing engaging, informative content for a travel destination guide. Use all the provided information to create compelling descriptions.

Place Information:
${JSON.stringify(placeDataForPrompt, null, 2)}

Requirements:
1. Generate TWO separate descriptions:
   - SHORT DESCRIPTION: 1-2 sentences (max 150 characters) that captures the essence and appeal - punchy, memorable, suitable for a card preview
   - LONG CONTENT: 2-4 paragraphs (approximately 150-300 words) that is engaging and descriptive, highlighting what makes this place special

2. For the LONG CONTENT:
   - Include relevant details from the Google Places data (rating, price level, unique features)
   - Mention the location/neighborhood context if available
   - If there are reviews, subtly incorporate insights from them
   - If Michelin-starred, emphasize that distinction
   - Write in a style suitable for a premium travel guide
   - Avoid generic phrases, be specific and authentic
   - Do NOT include HTML tags or markdown formatting - just plain text with line breaks
   - If editorial_summary exists, use it as reference but expand and enhance it

3. Return your response as a JSON object with exactly these fields:
   {
     "description": "short description here (1-2 sentences, max 150 chars)",
     "content": "long content here (2-4 paragraphs)"
   }

Generate both descriptions now:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a travel content writer for a premium travel guide. Generate engaging, informative descriptions for destinations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '';

    if (!responseText) {
      return { ok: false, error: 'empty_response' };
    }

    // Parse JSON response
    let generatedData: { description?: string; content?: string };
    try {
      generatedData = JSON.parse(responseText);
    } catch (parseError) {
      // Fallback: try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedData = JSON.parse(jsonMatch[0]);
      } else {
        // Last resort: use entire response as content and extract first sentence as description
        generatedData = {
          content: responseText,
          description: responseText.split(/[.!?]/)[0].substring(0, 150),
        };
      }
    }

    const generatedDescription = generatedData.description?.trim() || '';
    const generatedContent = generatedData.content?.trim() || generatedData.description?.trim() || '';

    if (!generatedContent || generatedContent.length < 50) {
      return { ok: false, error: 'content_too_short' };
    }

    if (!generatedDescription || generatedDescription.length < 10) {
      return { ok: false, error: 'description_too_short' };
    }

    // Update database
    const { error: updateError } = await supabase
      .from('destinations')
      .update({ 
        description: generatedDescription,
        content: generatedContent 
      })
      .eq('slug', dest.slug);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message || 'unknown_error' };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : undefined;
  const offset = args[1] ? parseInt(args[1]) : 0;

  console.log('🚀 Starting to rewrite about sections using existing editorial_summary...\n');

  // Fetch destinations that have editorial_summary OR any Google Places data
  // First check if editorial_summary column exists
  let query = supabase
    .from('destinations')
    .select('slug, name, google_place_id, formatted_address, rating, user_ratings_total')
    .order('id', { ascending: true });

  // Try to filter by editorial_summary if it exists, otherwise get all with Google data
  if (limit) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data: destinations, error } = await query;

  if (error) {
    console.error('❌ Error fetching destinations:', error);
    // Try without editorial_summary filter
    let fallbackQuery = supabase
      .from('destinations')
      .select('slug, name, google_place_id, formatted_address, rating, user_ratings_total')
      .not('google_place_id', 'is', null)
      .order('id', { ascending: true });
    
    if (limit) {
      fallbackQuery = fallbackQuery.range(offset, offset + limit - 1);
    }
    
    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    
    if (fallbackError) {
      console.error('❌ Error fetching destinations:', fallbackError);
      process.exit(1);
    }
    
    if (!fallbackData || fallbackData.length === 0) {
      console.log('❌ No destinations found with Google Places data');
      process.exit(1);
    }
    
    console.log(`📊 Found ${fallbackData.length} destinations with Google Places data\n`);
    destinations = fallbackData;
  }

  let processed = 0;
  let updated = 0;
  let failed = 0;
  const failures: Array<{ slug: string; error: string }> = [];

  for (const dest of destinations) {
    processed++;
    const progress = `[${processed}/${destinations.length}]`;

    console.log(`${progress} ✍️  Rewriting ${dest.slug}...`);

    const result = await rewriteAboutForDestination(dest);

    if (result.ok) {
      console.log(`${progress} ✅ ${dest.slug} - rewritten successfully`);
      updated++;
    } else {
      console.log(`${progress} ❌ ${dest.slug} - failed: ${result.error}`);
      failed++;
      failures.push({ slug: dest.slug, error: result.error || 'Unknown error' });
    }

    // Rate limiting: 1 request per second (Gemini API rate limits)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Rewritten: ${updated}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total: ${processed}`);

  if (failures.length > 0) {
    console.log('\n❌ Failures:');
    failures.slice(0, 10).forEach(f => {
      console.log(`   - ${f.slug}: ${f.error}`);
    });
    if (failures.length > 10) {
      console.log(`   ... and ${failures.length - 10} more`);
    }
  }
}

main().catch(console.error);

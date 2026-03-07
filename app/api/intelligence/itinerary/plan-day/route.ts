import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { genAI, GEMINI_MODEL } from '@/lib/gemini';
import { withErrorHandling, createValidationError } from '@/lib/errors';

interface ItineraryItem {
  time: string;
  destination: {
    name: string;
    slug: string;
    category: string;
    city: string;
  };
  duration: string;
  notes?: string;
}

interface GeneratedItinerary {
  title: string;
  city: string;
  items: ItineraryItem[];
  tips?: string[];
}

const PLAN_DAY_SYSTEM_PROMPT = `You are a travel planning assistant for Urban Manual. Your task is to create a day itinerary for a user visiting a city.

Guidelines:
- Create a realistic day itinerary with 4-6 destinations
- Include a mix of categories (restaurants, cafes, activities) based on the user's request
- Space out visits appropriately (e.g., breakfast 8-9am, lunch 12-1pm, dinner 7-9pm)
- Consider travel time between locations
- Provide practical tips when helpful
- Only suggest places that exist in our database (I'll provide options)

Response format: Return ONLY valid JSON with this structure:
{
  "title": "Your Day in [City]",
  "items": [
    {
      "time": "9:00 AM",
      "destination": {
        "name": "Place Name",
        "slug": "place-slug",
        "category": "restaurant",
        "city": "City Name"
      },
      "duration": "1 hour",
      "notes": "Optional tip or note"
    }
  ],
  "tips": ["Optional travel tips"]
}`;

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const body = await request.json();

  const { city, prompt, userContext, date } = body;

  if (!city) {
    throw createValidationError('City is required');
  }

  if (!prompt) {
    throw createValidationError('Prompt is required');
  }

  // Get destinations in this city
  const { data: destinations, error: destError } = await supabase
    .from('destinations')
    .select('id, name, slug, category, city, rating, price_level, micro_description')
    .ilike('city', city.toLowerCase().replace(/\s+/g, '-'))
    .order('rating', { ascending: false })
    .limit(50);

  if (destError) {
    console.error('Error fetching destinations:', destError);
    throw createValidationError('Failed to fetch destinations for this city');
  }

  if (!destinations || destinations.length === 0) {
    throw createValidationError(`No destinations found in ${city}`);
  }

  // Group destinations by category
  const byCategory: Record<string, typeof destinations> = {};
  destinations.forEach((d) => {
    const cat = d.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(d);
  });

  // Format destinations for AI
  const destinationsList = destinations
    .slice(0, 30)
    .map((d) => `- ${d.name} (${d.slug}): ${d.category}, rating ${d.rating || 'N/A'}${d.micro_description ? ` - ${d.micro_description}` : ''}`)
    .join('\n');

  // Build user context info
  let contextInfo = '';
  if (userContext) {
    const parts = [];
    if (userContext.travelStyle) parts.push(`Travel style: ${userContext.travelStyle}`);
    if (userContext.favoriteCategories?.length) parts.push(`Prefers: ${userContext.favoriteCategories.join(', ')}`);
    if (userContext.highlyRatedVisits?.length) {
      const liked = userContext.highlyRatedVisits.map((v: { slug: string }) => v.slug).slice(0, 5).join(', ');
      parts.push(`Previously enjoyed: ${liked}`);
    }
    if (parts.length > 0) {
      contextInfo = `\n\nUser preferences: ${parts.join('. ')}`;
    }
  }

  // Generate itinerary with Gemini
  if (!genAI) {
    throw createValidationError('AI service not available');
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
    },
  });

  const fullPrompt = `${PLAN_DAY_SYSTEM_PROMPT}

City: ${city}
Date: ${date || 'Today'}
User request: "${prompt}"
${contextInfo}

Available destinations in ${city}:
${destinationsList}

Categories available: ${Object.keys(byCategory).join(', ')}

Create a day itinerary matching the user's request. Use ONLY destinations from the list above.`;

  try {
    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    // Parse JSON from response
    let itinerary: GeneratedItinerary;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                        responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, responseText];
      const jsonStr = jsonMatch[1] || responseText;
      itinerary = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse itinerary JSON:', parseError, responseText);

      // Fallback: Create a basic itinerary
      const restaurants = byCategory['restaurant'] || [];
      const cafes = byCategory['cafe'] || [];
      const other = destinations.filter(d => !['restaurant', 'cafe'].includes(d.category || ''));

      itinerary = {
        title: `Your Day in ${city}`,
        city,
        items: [
          ...(cafes[0] ? [{
            time: '9:00 AM',
            destination: {
              name: cafes[0].name,
              slug: cafes[0].slug,
              category: 'cafe',
              city,
            },
            duration: '1 hour',
            notes: 'Start your day with coffee',
          }] : []),
          ...(restaurants[0] ? [{
            time: '12:30 PM',
            destination: {
              name: restaurants[0].name,
              slug: restaurants[0].slug,
              category: 'restaurant',
              city,
            },
            duration: '1.5 hours',
            notes: 'Lunch',
          }] : []),
          ...(other[0] ? [{
            time: '3:00 PM',
            destination: {
              name: other[0].name,
              slug: other[0].slug,
              category: other[0].category || 'attraction',
              city,
            },
            duration: '2 hours',
            notes: 'Afternoon activity',
          }] : []),
          ...(restaurants[1] ? [{
            time: '7:30 PM',
            destination: {
              name: restaurants[1].name,
              slug: restaurants[1].slug,
              category: 'restaurant',
              city,
            },
            duration: '2 hours',
            notes: 'Dinner',
          }] : []),
        ],
        tips: ['Book restaurants in advance when possible'],
      };
    }

    // Validate and clean itinerary
    itinerary.city = city;
    if (!itinerary.title) itinerary.title = `Your Day in ${city}`;
    if (!itinerary.items) itinerary.items = [];

    // Verify destinations exist
    const validItems = itinerary.items.filter((item) => {
      const exists = destinations.some(d => d.slug === item.destination?.slug);
      if (!exists) {
        // Try to find by name
        const byName = destinations.find(d =>
          d.name.toLowerCase() === item.destination?.name?.toLowerCase()
        );
        if (byName) {
          item.destination.slug = byName.slug;
          return true;
        }
      }
      return exists;
    });

    itinerary.items = validItems.length > 0 ? validItems : itinerary.items.slice(0, 6);

    return NextResponse.json({
      success: true,
      itinerary,
    });
  } catch (aiError: unknown) {
    console.error('AI generation error:', aiError);
    throw createValidationError('Failed to generate itinerary. Please try again.');
  }
});

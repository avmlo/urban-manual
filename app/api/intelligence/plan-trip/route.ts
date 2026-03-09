/**
 * Natural Language Trip Planning API
 *
 * Handles natural language requests to plan, modify, and optimize trips.
 *
 * Example prompts:
 * - "Plan a 3-day Tokyo trip focused on food and architecture"
 * - "Add a coffee break near my Shibuya activities tomorrow"
 * - "Rearrange Day 2 to minimize walking"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { genAI, GEMINI_MODEL_PRO } from '@/lib/gemini';
import { withErrorHandling, createValidationError, createUnauthorizedError } from '@/lib/errors';
import { tasteProfileEvolutionService } from '@/services/intelligence/taste-profile-evolution';
import type { Trip, ItineraryItem, InsertItineraryItem } from '@/types/trip';
import { SchemaType, type FunctionDeclaration, type FunctionCallingMode, type Content, type Part } from '@google/generative-ai';
import {
  enforceRateLimit,
  conversationRatelimit,
  memoryConversationRatelimit,
} from '@/lib/rate-limit';

// ============================================================================
// Types
// ============================================================================

interface PlanTripRequest {
  prompt: string;
  userId?: string;
  tripId?: string; // Optional: for modifying existing trips
  context?: {
    currentCity?: string;
    currentDay?: number;
    existingItems?: ItineraryItem[];
  };
}

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface Destination {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  rating?: number;
  price_level?: number;
  latitude?: number;
  longitude?: number;
  micro_description?: string;
  opening_hours_json?: any;
}

// ============================================================================
// Gemini Tool Definitions
// ============================================================================

const toolDefinitions: FunctionDeclaration[] = [
  {
    name: 'search_destinations',
    description:
      'Search for destinations (restaurants, hotels, attractions, bars, cafes) in a city. Use this to find places that match user preferences.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        city: {
          type: SchemaType.STRING,
          description: 'The city to search in (e.g., "Tokyo", "Paris", "London")',
        },
        category: {
          type: SchemaType.STRING,
          description:
            'Optional category filter: restaurant, hotel, bar, cafe, attraction, museum, shop, etc.',
        },
        query: {
          type: SchemaType.STRING,
          description:
            'Optional search query for specific types (e.g., "ramen", "boutique hotel", "modern architecture")',
        },
        limit: {
          type: SchemaType.NUMBER,
          description: 'Maximum number of results (default: 10, max: 25)',
        },
      },
      required: ['city'],
    },
  },
  {
    name: 'create_trip',
    description:
      'Create a new trip for the user. Call this when the user wants to start planning a new trip.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: 'Title for the trip (e.g., "Tokyo Food Adventure", "3 Days in Paris")',
        },
        destination: {
          type: SchemaType.STRING,
          description: 'Primary destination city or cities (can be JSON array for multi-city)',
        },
        start_date: {
          type: SchemaType.STRING,
          description: 'Start date in YYYY-MM-DD format (optional)',
        },
        end_date: {
          type: SchemaType.STRING,
          description: 'End date in YYYY-MM-DD format (optional)',
        },
        description: {
          type: SchemaType.STRING,
          description: 'Brief description of the trip theme or purpose',
        },
      },
      required: ['title', 'destination'],
    },
  },
  {
    name: 'add_to_itinerary',
    description:
      'Add a destination to the trip itinerary. Use this after searching for destinations to add them to specific days.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        trip_id: {
          type: SchemaType.STRING,
          description: 'The trip ID to add the item to',
        },
        destination_slug: {
          type: SchemaType.STRING,
          description: 'The destination slug from search results',
        },
        day: {
          type: SchemaType.NUMBER,
          description: 'Day number (1, 2, 3, etc.)',
        },
        time: {
          type: SchemaType.STRING,
          description: 'Time for the activity (e.g., "09:00", "14:30", "19:00")',
        },
        duration: {
          type: SchemaType.NUMBER,
          description: 'Duration in minutes (e.g., 60, 90, 120)',
        },
        notes: {
          type: SchemaType.STRING,
          description: 'Optional notes about this stop (e.g., "Book in advance", "Try the omakase")',
        },
      },
      required: ['trip_id', 'destination_slug', 'day', 'time'],
    },
  },
  {
    name: 'get_travel_time',
    description:
      'Get travel time between two locations. Use this to optimize itineraries and check if schedules are realistic.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        from_slug: {
          type: SchemaType.STRING,
          description: 'Origin destination slug',
        },
        to_slug: {
          type: SchemaType.STRING,
          description: 'Destination slug',
        },
        mode: {
          type: SchemaType.STRING,
          description: 'Travel mode: walking, transit, or driving (default: walking)',
        },
      },
      required: ['from_slug', 'to_slug'],
    },
  },
  {
    name: 'check_opening_hours',
    description:
      'Check if a destination is open at a specific time or get its opening hours. Use this before adding items to ensure places will be open.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        destination_slug: {
          type: SchemaType.STRING,
          description: 'The destination slug to check',
        },
        date: {
          type: SchemaType.STRING,
          description: 'Date to check in YYYY-MM-DD format (optional, defaults to today)',
        },
        time: {
          type: SchemaType.STRING,
          description: 'Time to check in HH:MM format (optional)',
        },
      },
      required: ['destination_slug'],
    },
  },
  {
    name: 'get_trip_details',
    description:
      'Get details of an existing trip including all itinerary items. Use this to understand the current plan before making modifications.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        trip_id: {
          type: SchemaType.STRING,
          description: 'The trip ID to retrieve',
        },
      },
      required: ['trip_id'],
    },
  },
  {
    name: 'modify_itinerary_item',
    description:
      'Modify an existing itinerary item (change time, day, or remove it). Use for rearranging schedules.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        item_id: {
          type: SchemaType.STRING,
          description: 'The itinerary item ID to modify',
        },
        updates: {
          type: SchemaType.OBJECT,
          properties: {
            day: { type: SchemaType.NUMBER, description: 'New day number' },
            time: { type: SchemaType.STRING, description: 'New time (HH:MM format)' },
            order_index: { type: SchemaType.NUMBER, description: 'New order within the day' },
            notes: { type: SchemaType.STRING, description: 'Updated notes' },
          },
        },
        action: {
          type: SchemaType.STRING,
          description: 'Action to perform: update or delete',
        },
      },
      required: ['item_id', 'action'],
    },
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user taste profile for personalization
 */
async function getUserTasteProfile(userId: string) {
  try {
    const profile = await tasteProfileEvolutionService.getTasteProfile(userId);
    if (!profile) return null;

    return {
      favoriteCategories: profile.preferences.categories.slice(0, 5).map((c) => c.category),
      favoriteCities: profile.preferences.cities.slice(0, 3).map((c) => c.city),
      priceRange: profile.preferences.priceRange,
      travelStyle: profile.preferences.travelStyle,
    };
  } catch (error) {
    console.error('Error fetching taste profile:', error);
    return null;
  }
}

/**
 * Get user's existing trips for context
 */
async function getUserTrips(userId: string, supabase: any): Promise<Trip[]> {
  try {
    const { data: trips, error } = await supabase
      .from('trips')
      .select('id, title, destination, start_date, end_date, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return trips || [];
  } catch (error) {
    console.error('Error fetching user trips:', error);
    return [];
  }
}

/**
 * Build the planning prompt with user context
 */
function buildPlanningPrompt(
  userPrompt: string,
  tasteProfile: any,
  existingTrips: Trip[],
  context?: PlanTripRequest['context']
): string {
  let systemContext = `You are an expert travel planner for Urban Manual, a curated travel guide with 900+ hand-picked destinations worldwide.

Your role is to help users plan trips by:
1. Understanding their preferences and requirements from natural language
2. Finding relevant destinations using the search_destinations tool
3. Creating trips and adding items to itineraries
4. Checking opening hours and travel times to ensure realistic schedules
5. Optimizing itineraries when asked

Guidelines:
- Always search for destinations before suggesting them
- Check opening hours before adding items to ensure places are open
- Consider travel time between locations when scheduling
- Space out meals appropriately (breakfast 8-10am, lunch 12-2pm, dinner 7-9pm)
- Include a mix of activities based on user preferences
- Respect the user's travel style and budget preferences
- For multi-day trips, create balanced days with 4-6 activities each
- When modifying existing trips, always get_trip_details first

Response format:
- After completing actions, provide a friendly summary of what you did
- Include practical tips relevant to the destinations
- Mention any scheduling considerations (early reservations, peak times)
`;

  if (tasteProfile) {
    systemContext += `\n\nUser Preferences:
- Favorite categories: ${tasteProfile.favoriteCategories?.join(', ') || 'Not specified'}
- Favorite cities: ${tasteProfile.favoriteCities?.join(', ') || 'Not specified'}
- Travel style: ${tasteProfile.travelStyle || 'Not specified'}
- Price range: ${tasteProfile.priceRange ? `${tasteProfile.priceRange.min}-${tasteProfile.priceRange.max}` : 'Not specified'}`;
  }

  if (existingTrips && existingTrips.length > 0) {
    systemContext += `\n\nUser's Recent Trips:
${existingTrips.slice(0, 5).map((t) => `- "${t.title}" to ${t.destination} (${t.status})`).join('\n')}`;
  }

  if (context?.currentCity) {
    systemContext += `\n\nCurrent Context:
- Working on trip in: ${context.currentCity}`;
    if (context.currentDay) {
      systemContext += `\n- Currently viewing: Day ${context.currentDay}`;
    }
    if (context.existingItems && context.existingItems.length > 0) {
      systemContext += `\n- Existing items today: ${context.existingItems.map((i) => i.title).join(', ')}`;
    }
  }

  return `${systemContext}\n\nUser request: "${userPrompt}"`;
}

// ============================================================================
// Tool Execution Handlers
// ============================================================================

async function executeSearchDestinations(
  args: { city: string; category?: string; query?: string; limit?: number },
  supabase: any
): Promise<ToolResult> {
  try {
    let query = supabase
      .from('destinations')
      .select('id, slug, name, city, category, rating, price_level, latitude, longitude, micro_description')
      .ilike('city', `%${args.city.toLowerCase().replace(/\s+/g, '-')}%`)
      .order('rating', { ascending: false })
      .limit(Math.min(args.limit || 10, 25));

    if (args.category) {
      query = query.ilike('category', `%${args.category}%`);
    }

    if (args.query) {
      // Search in name and description
      query = query.or(`name.ilike.%${args.query}%,micro_description.ilike.%${args.query}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      data: {
        destinations: data?.map((d: Destination) => ({
          slug: d.slug,
          name: d.name,
          category: d.category,
          rating: d.rating,
          price_level: d.price_level,
          description: d.micro_description,
        })),
        count: data?.length || 0,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeCreateTrip(
  args: {
    title: string;
    destination: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  },
  userId: string,
  supabase: any
): Promise<ToolResult> {
  try {
    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        title: args.title,
        destination: args.destination,
        start_date: args.start_date || null,
        end_date: args.end_date || null,
        description: args.description || null,
        status: 'planning',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        trip_id: trip.id,
        title: trip.title,
        destination: trip.destination,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeAddToItinerary(
  args: {
    trip_id: string;
    destination_slug: string;
    day: number;
    time: string;
    duration?: number;
    notes?: string;
  },
  supabase: any
): Promise<ToolResult> {
  try {
    // Get destination details
    const { data: destination, error: destError } = await supabase
      .from('destinations')
      .select('id, name, slug, category, city')
      .eq('slug', args.destination_slug)
      .single();

    if (destError || !destination) {
      return { success: false, error: 'Destination not found' };
    }

    // Get current max order_index for the day
    const { data: existingItems } = await supabase
      .from('itinerary_items')
      .select('order_index')
      .eq('trip_id', args.trip_id)
      .eq('day', args.day)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = (existingItems?.[0]?.order_index ?? -1) + 1;

    // Build notes JSON
    const notesData = {
      type: 'place' as const,
      duration: args.duration || 60,
      category: destination.category,
      city: destination.city,
      ...(args.notes && { raw: args.notes }),
    };

    const insertData: InsertItineraryItem = {
      trip_id: args.trip_id,
      destination_slug: args.destination_slug,
      day: args.day,
      order_index: nextOrder,
      time: args.time,
      title: destination.name,
      description: destination.category,
      notes: JSON.stringify(notesData),
    };

    const { data: item, error } = await supabase
      .from('itinerary_items')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        item_id: item.id,
        title: item.title,
        day: item.day,
        time: item.time,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetTravelTime(
  args: { from_slug: string; to_slug: string; mode?: string },
  supabase: any
): Promise<ToolResult> {
  try {
    // Get coordinates for both destinations
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('slug, name, latitude, longitude')
      .in('slug', [args.from_slug, args.to_slug]);

    if (error) throw error;
    if (!destinations || destinations.length !== 2) {
      return { success: false, error: 'One or both destinations not found' };
    }

    const from = destinations.find((d: Destination) => d.slug === args.from_slug);
    const to = destinations.find((d: Destination) => d.slug === args.to_slug);

    if (!from?.latitude || !from?.longitude || !to?.latitude || !to?.longitude) {
      return { success: false, error: 'Missing coordinates for travel time calculation' };
    }

    // Calculate haversine distance
    const R = 6371; // Earth's radius in km
    const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.latitude * Math.PI) / 180) *
        Math.cos((to.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Estimate duration based on mode
    const mode = args.mode || 'walking';
    let speed: number;
    switch (mode) {
      case 'driving':
        speed = 40;
        break;
      case 'transit':
        speed = 25;
        break;
      default:
        speed = 5;
    }

    const durationMinutes = Math.round((distance / speed) * 60);

    return {
      success: true,
      data: {
        from: from.name,
        to: to.name,
        distance_km: Math.round(distance * 10) / 10,
        duration_minutes: durationMinutes,
        mode,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeCheckOpeningHours(
  args: { destination_slug: string; date?: string; time?: string },
  supabase: any
): Promise<ToolResult> {
  try {
    const { data: destination, error } = await supabase
      .from('destinations')
      .select('slug, name, city, opening_hours_json, timezone_id, utc_offset')
      .eq('slug', args.destination_slug)
      .single();

    if (error || !destination) {
      return { success: false, error: 'Destination not found' };
    }

    if (!destination.opening_hours_json) {
      return {
        success: true,
        data: {
          name: destination.name,
          hours_available: false,
          message: 'Opening hours not available. Recommend checking directly.',
        },
      };
    }

    let hours;
    try {
      hours =
        typeof destination.opening_hours_json === 'string'
          ? JSON.parse(destination.opening_hours_json)
          : destination.opening_hours_json;
    } catch {
      return {
        success: true,
        data: {
          name: destination.name,
          hours_available: false,
          message: 'Could not parse opening hours.',
        },
      };
    }

    return {
      success: true,
      data: {
        name: destination.name,
        hours_available: true,
        weekday_text: hours.weekday_text || [],
        open_now: hours.open_now,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeGetTripDetails(args: { trip_id: string }, userId: string, supabase: any): Promise<ToolResult> {
  try {
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', args.trip_id)
      .eq('user_id', userId)
      .single();

    if (tripError) {
      return { success: false, error: 'Trip not found or access denied' };
    }

    const { data: items, error: itemsError } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', args.trip_id)
      .order('day', { ascending: true })
      .order('order_index', { ascending: true });

    if (itemsError) throw itemsError;

    // Group items by day
    const days: Record<number, ItineraryItem[]> = {};
    for (const item of items || []) {
      if (!days[item.day]) days[item.day] = [];
      days[item.day].push(item);
    }

    return {
      success: true,
      data: {
        trip: {
          id: trip.id,
          title: trip.title,
          destination: trip.destination,
          start_date: trip.start_date,
          end_date: trip.end_date,
          status: trip.status,
        },
        days: Object.entries(days).map(([day, dayItems]) => ({
          day: parseInt(day),
          items: dayItems.map((i) => ({
            id: i.id,
            title: i.title,
            time: i.time,
            destination_slug: i.destination_slug,
            order_index: i.order_index,
          })),
        })),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function executeModifyItineraryItem(
  args: {
    item_id: string;
    action: 'update' | 'delete';
    updates?: { day?: number; time?: string; order_index?: number; notes?: string };
  },
  userId: string,
  supabase: any
): Promise<ToolResult> {
  try {
    // Verify ownership through trip
    const { data: item, error: itemError } = await supabase
      .from('itinerary_items')
      .select('id, trip_id')
      .eq('id', args.item_id)
      .single();

    if (itemError || !item) {
      return { success: false, error: 'Item not found' };
    }

    const { data: trip } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', item.trip_id)
      .eq('user_id', userId)
      .single();

    if (!trip) {
      return { success: false, error: 'Access denied' };
    }

    if (args.action === 'delete') {
      const { error } = await supabase.from('itinerary_items').delete().eq('id', args.item_id);

      if (error) throw error;
      return { success: true, data: { deleted: true } };
    }

    if (args.action === 'update' && args.updates) {
      const { data: updated, error } = await supabase
        .from('itinerary_items')
        .update(args.updates)
        .eq('id', args.item_id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: { updated: true, item: updated } };
    }

    return { success: false, error: 'Invalid action' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute a tool call and return the result
 */
async function executeTool(
  toolName: string,
  args: any,
  userId: string,
  supabase: any
): Promise<ToolResult> {
  switch (toolName) {
    case 'search_destinations':
      return executeSearchDestinations(args, supabase);
    case 'create_trip':
      return executeCreateTrip(args, userId, supabase);
    case 'add_to_itinerary':
      return executeAddToItinerary(args, supabase);
    case 'get_travel_time':
      return executeGetTravelTime(args, supabase);
    case 'check_opening_hours':
      return executeCheckOpeningHours(args, supabase);
    case 'get_trip_details':
      return executeGetTripDetails(args, userId, supabase);
    case 'modify_itinerary_item':
      return executeModifyItineraryItem(args, userId, supabase);
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

// ============================================================================
// Main API Handler
// ============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError('Authentication required');
  }

  // Rate limiting (user-based)
  const rateLimitResponse = await enforceRateLimit({
    request,
    userId: user.id,
    message: 'Too many trip planning requests. Please wait a moment.',
    limiter: conversationRatelimit,
    memoryLimiter: memoryConversationRatelimit,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const body: PlanTripRequest = await request.json();
  const { prompt, context } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw createValidationError('Prompt is required');
  }

  // Check Gemini availability
  if (!genAI) {
    throw createValidationError('AI service not available');
  }

  // Get user context for personalization
  const [tasteProfile, existingTrips] = await Promise.all([
    getUserTasteProfile(user.id),
    getUserTrips(user.id, supabase),
  ]);

  // Build the planning prompt
  const systemPrompt = buildPlanningPrompt(prompt, tasteProfile, existingTrips, context);

  // Initialize Gemini with function calling
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL_PRO,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4000,
    },
    tools: [{ functionDeclarations: toolDefinitions }],
    toolConfig: {
      functionCallingConfig: {
        mode: 'AUTO' as FunctionCallingMode,
      },
    },
  });

  // Start conversation
  const chat = model.startChat({
    history: [],
  });

  try {
    // Send initial prompt
    let response = await chat.sendMessage(systemPrompt);
    let result = response.response;

    // Track actions taken
    const actions: Array<{ tool: string; args: any; result: ToolResult }> = [];
    let iterationCount = 0;
    const maxIterations = 10;

    // Process tool calls in a loop
    while (iterationCount < maxIterations) {
      const candidate = result.candidates?.[0];
      if (!candidate) break;

      const parts = candidate.content?.parts;
      if (!parts || parts.length === 0) break;

      // Check for function calls
      const functionCalls = parts.filter((part: Part) => 'functionCall' in part);

      if (functionCalls.length === 0) {
        // No more function calls, we have the final response
        break;
      }

      // Execute all function calls
      const functionResponses: Content = {
        role: 'function',
        parts: [],
      };

      for (const part of functionCalls) {
        if (!('functionCall' in part)) continue;

        const functionCall = part.functionCall;
        if (!functionCall) continue;

        const toolName = functionCall.name;
        const args = functionCall.args as Record<string, any>;

        console.log(`[plan-trip] Executing tool: ${toolName}`, args);

        const toolResult = await executeTool(toolName, args, user.id, supabase);

        actions.push({ tool: toolName, args, result: toolResult });

        functionResponses.parts.push({
          functionResponse: {
            name: toolName,
            response: toolResult,
          },
        });
      }

      // Send function results back to model
      response = await chat.sendMessage(functionResponses.parts);
      result = response.response;
      iterationCount++;
    }

    // Extract final text response
    let finalText = '';
    const finalParts = result.candidates?.[0]?.content?.parts;
    if (finalParts) {
      for (const part of finalParts) {
        if ('text' in part) {
          finalText += part.text;
        }
      }
    }

    // Extract created trip/items info from actions
    const createdTrip = actions.find((a) => a.tool === 'create_trip' && a.result.success)?.result.data;
    const addedItems = actions
      .filter((a) => a.tool === 'add_to_itinerary' && a.result.success)
      .map((a) => a.result.data);

    return NextResponse.json({
      success: true,
      message: finalText || 'Trip planning complete.',
      actions: actions.map((a) => ({
        tool: a.tool,
        success: a.result.success,
        summary: a.result.success ? a.result.data : a.result.error,
      })),
      result: {
        trip: createdTrip,
        items_added: addedItems,
      },
    });
  } catch (aiError: any) {
    console.error('[plan-trip] AI error:', aiError);
    throw createValidationError('Failed to process trip planning request. Please try again.');
  }
});

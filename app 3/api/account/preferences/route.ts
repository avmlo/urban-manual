import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/account/preferences
 * Fetch user's taste profile/preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('favorite_cities, favorite_categories, travel_style, interests, dietary_preferences, price_preference')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    return NextResponse.json({
      preferences: {
        favoriteCities: profile?.favorite_cities || [],
        favoriteCategories: profile?.favorite_categories || [],
        travelStyle: profile?.travel_style || null,
        interests: profile?.interests || [],
        dietaryPreferences: profile?.dietary_preferences || [],
        pricePreference: profile?.price_preference || null,
      },
    });
  } catch (error: any) {
    console.error('Preferences API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/account/preferences
 * Update user's taste profile/preferences
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      favoriteCities,
      favoriteCategories,
      travelStyle,
      interests,
      dietaryPreferences,
      pricePreference,
    } = body;

    // Update or insert profile
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        favorite_cities: favoriteCities || [],
        favorite_categories: favoriteCategories || [],
        travel_style: travelStyle || null,
        interests: interests || [],
        dietary_preferences: dietaryPreferences || [],
        price_preference: pricePreference || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences: data });
  } catch (error: any) {
    console.error('Preferences API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

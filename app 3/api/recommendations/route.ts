import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { AIRecommendationEngine } from '@/lib/ai-recommendations/engine';

// Rate limiting (simple in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(userId);
  
  if (!limit || now > limit.resetAt) {
    // Reset limit (5 requests per hour)
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: now + 60 * 60 * 1000
    });
    return true;
  }
  
  if (limit.count >= 5) {
    return false;
  }
  
  limit.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Get query parameters first (for slug-based recommendations)
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    // If slug is provided, use related destinations endpoint instead
    if (slug) {
      try {
        const supabase = await createServerClient();
        const { data: destination } = await supabase
          .from('destinations')
          .select('id, city, category')
          .eq('slug', slug)
          .single();
        
        if (!destination) {
          return NextResponse.json({ recommendations: [], count: 0 });
        }
        
        // Get related destinations
        const { data: related } = await supabase
          .from('destinations')
          .select('*')
          .or(`city.eq.${destination.city},category.eq.${destination.category}`)
          .neq('slug', slug)
          .limit(limit);
        
        return NextResponse.json({
          recommendations: (related || []).map(d => ({ destination: d })),
          count: related?.length || 0
        });
      } catch (error: any) {
        console.error('[API] Related destinations error:', error);
        return NextResponse.json({ recommendations: [], count: 0 });
      }
    }
    
    // 2. Authenticate user for personalized recommendations
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 3. Check rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }
    
    const forceRefresh = searchParams.get('refresh') === 'true';
    const filterCity = searchParams.get('city');
    
    // Validate limit
    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }
    
    // 4. Initialize engine
    const engine = new AIRecommendationEngine(user.id);
    
    // 5. Check if refresh needed
    const needsRefresh = forceRefresh || await engine.needsRefresh();
    
    let recommendations;
    
    if (needsRefresh) {
      // Generate new recommendations
      console.log('[API] Generating new recommendations...');
      recommendations = await engine.generateRecommendations(filterCity ? limit * 2 : limit);
    } else {
      // Use cached recommendations
      console.log('[API] Using cached recommendations...');
      recommendations = await engine.getCachedRecommendations(filterCity ? limit * 2 : limit);
    }
    
    // 6. Fetch full destination data (with RLS enforced)
    const destinationIds = recommendations.map(r => r.destinationId);
    
    if (destinationIds.length === 0) {
      return NextResponse.json({
        recommendations: [],
        cached: !needsRefresh,
        count: 0
      });
    }
    
    const { data: destinations, error: destError } = await supabase
      .from('destinations')
      .select('*')
      .in('id', destinationIds);
    
    if (destError) {
      console.error('[API] Error fetching destinations:', destError);
      return NextResponse.json({
        recommendations: [],
        cached: !needsRefresh,
        count: 0
      });
    }
    
    // 7. Combine scores with destinations
    let result = recommendations.map(rec => {
      const destination = destinations?.find((d: any) => d.id === rec.destinationId);
      return {
        ...rec,
        destination
      };
    }).filter(r => r.destination); // Remove any missing destinations
    
    // 8. Filter by city if specified
    if (filterCity) {
      result = result.filter(rec => 
        rec.destination?.city?.toLowerCase() === filterCity.toLowerCase()
      ).slice(0, limit);
    }
    
    return NextResponse.json({
      recommendations: result,
      cached: !needsRefresh,
      count: result.length
    });
    
  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Force refresh endpoint (POST)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check rate limit (stricter for POST)
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    const body = await request.json().catch(() => ({}));
    const limit = parseInt(body.limit || '20', 10);
    
    const engine = new AIRecommendationEngine(user.id);
    const recommendations = await engine.generateRecommendations(limit);
    
    // Fetch destinations
    const destinationIds = recommendations.map(r => r.destinationId);
    const { data: destinations } = await supabase
      .from('destinations')
      .select('*')
      .in('id', destinationIds);
    
    const result = recommendations.map(rec => {
      const destination = destinations?.find((d: any) => d.id === rec.destinationId);
      return {
        ...rec,
        destination
      };
    }).filter(r => r.destination);
    
    return NextResponse.json({
      recommendations: result,
      cached: false,
      count: result.length
    });
    
  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

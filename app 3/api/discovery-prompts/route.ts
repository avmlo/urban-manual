import { NextRequest, NextResponse } from 'next/server';
import { DiscoveryPromptService } from '@/lib/discovery-prompts';
import { requireAdmin, AuthError } from '@/lib/adminAuth';

/**
 * GET /api/discovery-prompts
 * 
 * Query parameters:
 * - city: string (required) - City to get prompts for
 * - destination_slug: string (optional) - Specific destination slug
 * - date: string (optional) - Date to check (YYYY-MM-DD), defaults to today
 * 
 * Returns active discovery prompts for the given city/destination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const destinationSlug = searchParams.get('destination_slug') || undefined;
    const dateParam = searchParams.get('date');

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }

    const date = dateParam ? new Date(dateParam) : new Date();

    const response = await DiscoveryPromptService.getAllPromptsForCity(
      city,
      destinationSlug,
      date
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching discovery prompts:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch discovery prompts',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/discovery-prompts
 * 
 * Create a new discovery prompt (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const { serviceClient } = await requireAdmin(request);
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['city', 'title', 'prompt_text', 'prompt_type', 'start_date', 'end_date'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Prepare insert data
    const insertData: any = {
      city: body.city.toLowerCase(),
      country: body.country,
      destination_slug: body.destination_slug,
      title: body.title,
      prompt_text: body.prompt_text,
      short_prompt: body.short_prompt,
      prompt_type: body.prompt_type,
      start_date: body.start_date,
      end_date: body.end_date,
      priority: body.priority || 5,
      is_recurring: body.is_recurring || false,
      action_text: body.action_text,
      booking_url: body.booking_url,
      related_links: body.related_links ? JSON.stringify(body.related_links) : null,
      is_active: body.is_active !== undefined ? body.is_active : true,
    };

    // Handle recurring prompts
    if (insertData.is_recurring) {
      insertData.recurrence_pattern = body.recurrence_pattern || 'yearly';
      
      // Parse dates to extract month/day for recurring events
      if (body.start_date && body.end_date) {
        const startDate = new Date(body.start_date);
        const endDate = new Date(body.end_date);
        insertData.recurrence_start_month = startDate.getMonth() + 1;
        insertData.recurrence_start_day = startDate.getDate();
        insertData.recurrence_end_month = endDate.getMonth() + 1;
        insertData.recurrence_end_day = endDate.getDate();
      }
    }

    const { data, error } = await serviceClient
      .from('discovery_prompts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating discovery prompt:', error);
      return NextResponse.json(
        { error: 'Failed to create discovery prompt', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, prompt: data }, { status: 201 });
  } catch (error: any) {
    // Handle authentication/authorization errors
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error creating discovery prompt:', error);
    return NextResponse.json(
      {
        error: 'Failed to create discovery prompt',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


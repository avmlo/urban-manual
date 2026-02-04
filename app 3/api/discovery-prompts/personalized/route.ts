import { NextRequest, NextResponse } from 'next/server';
import { generatePersonalizedPrompt, GenerativePromptContext } from '@/lib/discovery-prompts-generative';
import { DiscoveryPromptService } from '@/lib/discovery-prompts';

/**
 * GET /api/discovery-prompts/personalized
 * 
 * Query parameters:
 * - city: string (required)
 * - user_id: string (optional) - For personalized prompts
 * - date: string (optional) - Date to check (YYYY-MM-DD)
 * 
 * Returns personalized discovery prompts using generative AI
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const userId = searchParams.get('user_id') || undefined;
    const userName = searchParams.get('user_name') || undefined;
    const dateParam = searchParams.get('date');

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter is required' },
        { status: 400 }
      );
    }

    const date = dateParam ? new Date(dateParam) : new Date();

    // Get base prompts for the city
    const basePrompts = await DiscoveryPromptService.getPromptsForCity(city, date);

    // Generate personalized prompt if user_id provided
    let personalizedPrompt: string | null = null;
    if (userId) {
      const context: GenerativePromptContext = {
        userId,
        userName,
        city: city.toLowerCase(),
        currentPrompts: basePrompts,
      };

      personalizedPrompt = await generatePersonalizedPrompt(context);
    }

    return NextResponse.json({
      city,
      current_date: date.toISOString().split('T')[0],
      base_prompts: basePrompts,
      personalized_prompt: personalizedPrompt,
    });
  } catch (error: any) {
    console.error('Error fetching personalized discovery prompts:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch personalized discovery prompts',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


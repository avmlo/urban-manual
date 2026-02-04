/**
 * Assistant Preferences API endpoint
 * Get and update user's assistant preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAssistantPreferences,
  updateAssistantPreferences,
  AssistantPreferences
} from '@/lib/openai/assistants';

/**
 * GET /api/ai/assistants/preferences?userId=xxx
 * Get user's assistant preferences
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const preferences = await getAssistantPreferences(userId);
    
    return NextResponse.json({
      preferences: preferences || {
        assistant_name: 'Travel Planning Assistant',
        assistant_personality: 'friendly',
        response_style: 'balanced',
        use_emoji: true,
        enable_function_calling: true,
        enable_vision: true,
        enable_tts: false,
        preferred_model: 'auto',
        use_complex_model_threshold: 50,
        conversation_memory_days: 30,
        include_user_profile: true,
        include_travel_history: true
      }
    });
  } catch (error: any) {
    console.error('[Assistants Preferences] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai/assistants/preferences
 * Update user's assistant preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId, preferences } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'preferences object is required' },
        { status: 400 }
      );
    }

    const success = await updateAssistantPreferences(userId, preferences as Partial<AssistantPreferences>);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated'
    });
  } catch (error: any) {
    console.error('[Assistants Preferences] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences', details: error.message },
      { status: 500 }
    );
  }
}


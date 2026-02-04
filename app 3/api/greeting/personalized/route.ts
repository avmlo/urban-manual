/**
 * AI-Generated Personalized Greeting API
 * POST /api/greeting/personalized
 *
 * Generates context-aware greeting using LLM based on user data
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/llm';
import { createServiceRoleClient } from '@/lib/supabase-server';

export const runtime = 'edge';

interface GreetingRequest {
  userId?: string;
  userName?: string;
  userProfile?: any;
  lastSession?: any;
  journey?: any;
  recentAchievements?: any[];
  weather?: any;
  trendingCity?: string;
  currentHour?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GreetingRequest;

    if (!body.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build rich context for AI
    const contextParts: string[] = [];

    // Basic context
    const hour = body.currentHour ?? new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    contextParts.push(`Current time: ${timeOfDay}`);

    if (body.userName) {
      contextParts.push(`User name: ${body.userName}`);
    }

    // User profile context
    if (body.userProfile) {
      const profile = body.userProfile;
      if (profile.favorite_cities && profile.favorite_cities.length > 0) {
        contextParts.push(`Favorite cities: ${profile.favorite_cities.join(', ')}`);
      }
      if (profile.favorite_categories && profile.favorite_categories.length > 0) {
        contextParts.push(`Favorite categories: ${profile.favorite_categories.join(', ')}`);
      }
      if (profile.travel_style) {
        contextParts.push(`Travel style: ${profile.travel_style}`);
      }
      if (profile.price_preference) {
        const budgetLabels = ['Budget', 'Moderate', 'Upscale', 'Luxury'];
        contextParts.push(`Budget preference: ${budgetLabels[profile.price_preference - 1]}`);
      }
    }

    // Session context
    if (body.lastSession) {
      const hoursSinceLastActivity = Math.floor(
        (Date.now() - new Date(body.lastSession.last_activity).getTime()) / (1000 * 60 * 60)
      );

      if (hoursSinceLastActivity < 24) {
        contextParts.push(`Active session from ${hoursSinceLastActivity} hours ago`);

        const summary = body.lastSession.context_summary;
        if (summary?.lastQuery) {
          contextParts.push(`Last search: "${summary.lastQuery}"`);
        }
        if (summary?.city) {
          contextParts.push(`Exploring: ${summary.city}`);
        }
        if (summary?.category) {
          contextParts.push(`Interested in: ${summary.category}`);
        }
        if (summary?.mood) {
          contextParts.push(`Mood: ${summary.mood}`);
        }
      } else if (hoursSinceLastActivity < 168) {
        contextParts.push(`Returning after ${Math.floor(hoursSinceLastActivity / 24)} days`);
      }
    }

    // Journey insights
    if (body.journey) {
      const journey = body.journey;
      if (journey.explorationStreak && journey.explorationStreak >= 3) {
        contextParts.push(`On a ${journey.explorationStreak}-day exploration streak`);
      }
      if (journey.citiesExplored && journey.citiesExplored.length > 0) {
        contextParts.push(`Has explored: ${journey.citiesExplored.join(', ')}`);
      }
      if (journey.recentPattern) {
        contextParts.push(`Pattern: ${journey.recentPattern}`);
      }
      if (journey.dominantMood) {
        contextParts.push(`Typical mood: ${journey.dominantMood}`);
      }
    }

    // Recent achievements
    if (body.recentAchievements && body.recentAchievements.length > 0) {
      const latest = body.recentAchievements[0];
      contextParts.push(`Just unlocked achievement: ${latest.name}`);
    }

    // Weather
    if (body.weather) {
      contextParts.push(
        `Weather in ${body.weather.city}: ${body.weather.temperature}°C, ${body.weather.description}`
      );
    }

    // Trending
    if (body.trendingCity) {
      contextParts.push(`Trending destination: ${body.trendingCity}`);
    }

    // Generate AI greeting
    const prompt = `You are a friendly, personalized travel assistant. Generate a warm, brief greeting message (1-2 sentences max, ~15-25 words) based on this context:

${contextParts.join('\n')}

The greeting should be:
- Warm and welcoming
- Reference relevant context (recent activity, favorites, or patterns)
- End with an open-ended question or invitation to explore
- Natural and conversational, not overly formal
- NO emojis in the greeting text itself (emojis will be added separately)

Examples:
- "Good morning! Still planning that Tokyo trip? I have some new Michelin spots to show you."
- "Welcome back! Ready to continue exploring romantic spots in Paris?"
- "Evening! You're on a 5-day streak. What adventure can I help with today?"

Generate ONE greeting:`;

    const greeting = await generateText(prompt, {
      temperature: 0.8,
      maxTokens: 50,
    });

    if (!greeting) {
      return NextResponse.json(
        { error: 'Failed to generate greeting' },
        { status: 500 }
      );
    }

    // Clean up the greeting
    const cleanedGreeting = greeting
      .trim()
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return NextResponse.json({
      greeting: cleanedGreeting,
      context: contextParts,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating personalized greeting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cache for 10 minutes (greetings don't need to be real-time)
export const revalidate = 600;

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { name, city, category, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Build prompt for Gemini
    const prompt = `You are a travel expert helping to create compelling content for a destination guide. 

Analyze this place and provide recommendations:

Place Name: ${name}
${city ? `City: ${city}` : ''}
${category ? `Current Category: ${category}` : ''}
${description ? `Current Description: ${description}` : ''}

Provide recommendations in this exact JSON format:
{
  "description": "A short, punchy 1-2 sentence description (max 150 characters) that captures the essence and appeal",
  "content": "A longer, engaging paragraph (200-400 words) describing the place, its atmosphere, what makes it special, best time to visit, and what to expect",
  "category": "Suggested category (one of: restaurant, cafe, bar, hotel, museum, gallery, shopping, park, attraction, nightlife, activity, or other)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggestions": "Brief suggestions for improvement or additional information to include"
}

Guidelines:
- Description should be concise and memorable, suitable for a card preview
- Content should be rich, descriptive, and help readers visualize the experience
- Tags should be lowercase, searchable keywords (e.g., "romantic", "family-friendly", "instagrammable", "hidden gem", "michelin", "rooftop", "speakeasy", "historic", "modern", "authentic")
- Category should match one of the standard categories
- Be creative but accurate - if you don't know specifics, focus on the general type and atmosphere
- Make it engaging and inspiring for travelers`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
            topP: 0.95,
            topK: 40,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response (Gemini sometimes wraps it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No valid JSON in Gemini response:', text);
      return NextResponse.json(
        { error: 'Invalid response format from Gemini' },
        { status: 500 }
      );
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse JSON:', jsonMatch[0]);
      return NextResponse.json(
        { error: 'Failed to parse Gemini response' },
        { status: 500 }
      );
    }

    // Validate and clean the result
    return NextResponse.json({
      description: result.description || '',
      content: result.content || '',
      category: result.category?.toLowerCase() || category || '',
      tags: Array.isArray(result.tags) ? result.tags : [],
      suggestions: result.suggestions || '',
    });

  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Gemini recommendations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get Gemini recommendations' },
      { status: 500 }
    );
  }
}

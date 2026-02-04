import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { reviews, destinationName } = await request.json();

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json(
        { error: 'No reviews provided' },
        { status: 400 }
      );
    }

    if (!destinationName) {
      return NextResponse.json(
        { error: 'Destination name is required' },
        { status: 400 }
      );
    }

    // Extract review texts (limit to first 10 reviews to avoid token limits)
    const reviewTexts = reviews
      .slice(0, 10)
      .map((r: any) => r.text)
      .filter((text: string) => text && text.length > 0)
      .join('\n\n');

    if (!reviewTexts) {
      return NextResponse.json(
        { error: 'No review text found' },
        { status: 400 }
      );
    }

    const prompt = `Summarize the following customer reviews for ${destinationName} in 2-3 concise sentences. Focus on:
- Common themes and highlights
- What customers love most
- Any notable concerns or patterns
- Overall sentiment

Reviews:
${reviewTexts}

Summary:`;

    const summary = await generateText(prompt, { 
      temperature: 0.7, 
      maxTokens: 150 
    });

    if (!summary) {
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error generating review summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


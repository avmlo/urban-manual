/**
 * OpenAI Vision API endpoint
 * Analyze images using GPT-4o with Vision
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeImage, searchByImage } from '@/lib/openai/vision';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, prompt, city, searchMode } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    if (searchMode === 'search') {
      // Visual search mode - generate search query from image
      const searchQuery = await searchByImage(imageUrl, city);
      return NextResponse.json({
        searchQuery,
        mode: 'search'
      });
    } else {
      // Analysis mode - detailed image analysis
      const analysis = await analyzeImage(imageUrl, prompt);
      
      if (!analysis) {
        return NextResponse.json(
          { error: 'Failed to analyze image' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        analysis,
        mode: 'analysis'
      });
    }
  } catch (error: any) {
    console.error('[Vision API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process image', details: error.message },
      { status: 500 }
    );
  }
}


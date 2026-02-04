/**
 * OpenAI Text-to-Speech API endpoint
 * Convert text to speech
 */

import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/lib/openai/tts';

export async function POST(request: NextRequest) {
  try {
    const { text, voice, format, speed } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    const audioBuffer = await textToSpeech(text, {
      voice: voice || 'nova',
      format: format || 'mp3',
      speed: speed || 1.0
    });

    if (!audioBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate speech' },
        { status: 500 }
      );
    }

    // Return audio as base64
    const base64 = audioBuffer.toString('base64');
    const mimeType = format === 'mp3' ? 'audio/mpeg' : 
                     format === 'opus' ? 'audio/opus' :
                     format === 'aac' ? 'audio/aac' : 'audio/flac';

    return NextResponse.json({
      audio: `data:${mimeType};base64,${base64}`,
      format: format || 'mp3',
      mimeType
    });
  } catch (error: any) {
    console.error('[TTS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech', details: error.message },
      { status: 500 }
    );
  }
}


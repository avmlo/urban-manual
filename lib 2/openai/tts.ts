/**
 * OpenAI Text-to-Speech (TTS) API integration
 * Convert text to speech for voice responses
 */

import { getOpenAI } from '../openai';

export type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
export type TTSFormat = 'mp3' | 'opus' | 'aac' | 'flac';

export interface TTSOptions {
  voice?: TTSVoice;
  format?: TTSFormat;
  speed?: number; // 0.25 to 4.0
}

/**
 * Generate speech from text
 */
export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer | null> {
  const openai = getOpenAI();
  if (!openai?.audio) {
    console.warn('[TTS] OpenAI audio API not available');
    return null;
  }

  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1', // or 'tts-1-hd' for higher quality
      voice: options.voice || 'nova',
      input: text,
      response_format: options.format || 'mp3',
      speed: options.speed || 1.0
    });

    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    console.error('[TTS] Error generating speech:', error);
    return null;
  }
}

/**
 * Generate speech and return as base64 data URL
 */
export async function textToSpeechDataURL(
  text: string,
  options: TTSOptions = {}
): Promise<string | null> {
  const audioBuffer = await textToSpeech(text, options);
  if (!audioBuffer) {
    return null;
  }

  const base64 = audioBuffer.toString('base64');
  const mimeType = options.format === 'mp3' ? 'audio/mpeg' : 
                   options.format === 'opus' ? 'audio/opus' :
                   options.format === 'aac' ? 'audio/aac' : 'audio/flac';
  
  return `data:${mimeType};base64,${base64}`;
}


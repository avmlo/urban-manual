/**
 * OpenAI Vision API integration
 * Analyze images using GPT-4o with Vision
 */

import { getOpenAI, OPENAI_MODEL_VISION } from '../openai';

export interface ImageAnalysisResult {
  description: string;
  style?: string;
  atmosphere?: string;
  tags?: string[];
  cuisine?: string;
  category?: string;
}

/**
 * Analyze an image URL using GPT-4o Vision
 */
export async function analyzeImage(imageUrl: string, prompt?: string): Promise<ImageAnalysisResult | null> {
  const openai = getOpenAI();
  if (!openai?.chat) {
    console.warn('[Vision] OpenAI client not available');
    return null;
  }

  try {
    const systemPrompt = `You are an expert at analyzing restaurant, hotel, and destination photos. 
Analyze the image and provide a detailed description including:
- Overall style and atmosphere
- Cuisine type (if restaurant)
- Category (restaurant, hotel, attraction, etc.)
- Relevant tags
- Any notable features

Return your analysis as JSON with: description, style, atmosphere, tags (array), cuisine, category`;

    const userPrompt = prompt || 'Analyze this image and describe the destination, including style, atmosphere, cuisine type, and relevant tags.';

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL_VISION,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    const text = response.choices?.[0]?.message?.content || '';
    
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(text);
      return parsed as ImageAnalysisResult;
    } catch {
      // If not JSON, return as description
      return {
        description: text,
        tags: extractTags(text)
      };
    }
  } catch (error: any) {
    console.error('[Vision] Error analyzing image:', error);
    return null;
  }
}

/**
 * Extract tags from text description
 */
function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Common tags
  const tagKeywords: { [key: string]: string } = {
    'romantic': 'romantic',
    'casual': 'casual',
    'fine dining': 'fine-dining',
    'luxury': 'luxury',
    'outdoor': 'outdoor-seating',
    'indoor': 'indoor',
    'modern': 'modern',
    'traditional': 'traditional',
    'cozy': 'cozy',
    'elegant': 'elegant',
    'rustic': 'rustic',
    'minimalist': 'minimalist'
  };

  for (const [keyword, tag] of Object.entries(tagKeywords)) {
    if (lowerText.includes(keyword)) {
      tags.push(tag);
    }
  }

  return tags;
}

/**
 * Search destinations by image (visual search)
 */
export async function searchByImage(imageUrl: string, city?: string): Promise<string> {
  const analysis = await analyzeImage(imageUrl, 
    `Analyze this destination image. Describe the style, atmosphere, cuisine type, and key features. 
    ${city ? `This is in ${city}.` : ''}
    Provide a search query that would help find similar places.`);
  
  if (analysis) {
    // Build search query from analysis
    const queryParts: string[] = [];
    if (analysis.cuisine) queryParts.push(analysis.cuisine);
    if (analysis.style) queryParts.push(analysis.style);
    if (analysis.atmosphere) queryParts.push(analysis.atmosphere);
    if (analysis.category) queryParts.push(analysis.category);
    
    return queryParts.join(' ') || analysis.description;
  }
  
  return '';
}


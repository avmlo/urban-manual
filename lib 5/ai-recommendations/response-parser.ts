import { Destination } from '@/types/destination';

export interface ParsedScore {
  destinationId: number;
  score: number;
  reason: string;
}

export function parseAIResponse(
  response: string,
  candidates: Destination[]
): ParsedScore[] {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    
    // Parse JSON
    const parsed = JSON.parse(jsonStr);
    
    // Validate structure
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }
    
    // Map to destination IDs and validate
    const scores: ParsedScore[] = [];
    
    for (const item of parsed) {
      // Validate required fields
      if (typeof item.index !== 'number' || 
          typeof item.score !== 'number' || 
          typeof item.reason !== 'string') {
        console.warn('Invalid score item:', item);
        continue;
      }
      
      // Validate index
      if (item.index < 0 || item.index >= candidates.length) {
        console.warn('Invalid index:', item.index);
        continue;
      }
      
      // Validate score range
      let score = item.score;
      if (score < 0 || score > 1) {
        console.warn('Score out of range:', score);
        score = Math.max(0, Math.min(1, score));
      }
      
      const candidate = candidates[item.index];
      if (!candidate.id) {
        console.warn('Candidate missing id:', candidate);
        continue;
      }
      
      scores.push({
        destinationId: candidate.id,
        score,
        reason: item.reason.trim()
      });
    }
    
    return scores;
    
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Response:', response);
    
    // Fallback: return empty array
    return [];
  }
}


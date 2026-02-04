import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { extractUserProfile } from './profile-extractor';
import { selectCandidates } from './candidate-selector';
import { buildScoringPrompt } from './prompt-builder';
import { parseAIResponse, ParsedScore } from './response-parser';
import { Destination } from '@/types/destination';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');

export class AIRecommendationEngine {
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  async generateRecommendations(limit: number = 20): Promise<ParsedScore[]> {
    try {
      // 1. Extract user profile
      console.log('[AI] Extracting user profile...');
      const profile = await extractUserProfile(this.userId);
      
      // 2. Select candidate destinations
      console.log('[AI] Selecting candidates...');
      const candidates = await selectCandidates(this.userId, profile, 100);
      
      if (candidates.length === 0) {
        console.warn('[AI] No candidates found');
        return [];
      }
      
      // 3. Build prompt
      console.log('[AI] Building prompt...');
      const prompt = buildScoringPrompt(profile, candidates);
      
      // 4. Call Gemini AI
      console.log('[AI] Calling Gemini API...');
      const model = genAI.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
        generationConfig: {
          temperature: 0.3, // Lower = more consistent
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4096,
        }
      });
      
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      console.log('[AI] Response received, parsing...');
      
      // 5. Parse response
      const scores = parseAIResponse(response, candidates);
      
      if (scores.length === 0) {
        console.error('[AI] No valid scores parsed');
        return [];
      }
      
      // 6. Sort by score and limit
      const topScores = scores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      // 7. Save to database (using service role to bypass RLS)
      console.log('[AI] Saving scores to database...');
      await this.saveScores(topScores);
      
      console.log(`[AI] Generated ${topScores.length} recommendations`);
      return topScores;
      
    } catch (error) {
      console.error('[AI] Error generating recommendations:', error);
      throw error;
    }
  }
  
  private async saveScores(scores: ParsedScore[]): Promise<void> {
    const supabase = createServiceRoleClient();
    
    if (!supabase) {
      console.error('Cannot save recommendations: Supabase client not available');
      return;
    }
    
    const cacheHours = parseInt(process.env.RECOMMENDATION_CACHE_HOURS || '168', 10);
    const expiresAt = new Date(Date.now() + (cacheHours * 60 * 60 * 1000));
    
    const records = scores.map(score => ({
      user_id: this.userId,
      destination_id: score.destinationId,
      score: score.score,
      reason: score.reason,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    }));
    
    if (!supabase) {
      console.error('Cannot update personalization scores: Supabase client not available');
      return;
    }
    
    const { error } = await supabase
      .from('personalization_scores')
      .upsert(records, { 
        onConflict: 'user_id,destination_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('[AI] Error saving scores:', error);
      throw error;
    }
  }
  
  // Get cached recommendations (fast)
  async getCachedRecommendations(limit: number = 20): Promise<ParsedScore[]> {
    const supabase = createServiceRoleClient();
    
    if (!supabase) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('personalization_scores')
      .select(`
        destination_id,
        score,
        reason
      `)
      .eq('user_id', this.userId)
      .gt('expires_at', new Date().toISOString())
      .order('score', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[AI] Error fetching cached scores:', error);
      return [];
    }
    
    return data?.map((d: any) => ({
      destinationId: d.destination_id,
      score: d.score,
      reason: d.reason || ''
    })) || [];
  }
  
  // Check if recommendations need refresh
  async needsRefresh(): Promise<boolean> {
    const client = createServiceRoleClient();
    
    if (!client) {
      return true;
    }
    
    const { count } = await client
      .from('personalization_scores')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', this.userId)
      .gt('expires_at', new Date().toISOString());
    
    // Refresh if less than 10 valid recommendations
    return (count || 0) < 10;
  }
}


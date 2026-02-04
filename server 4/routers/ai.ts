import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { generateDestinationEmbedding } from '@/lib/embeddings/generate';
import { findSimilarPlace, inferPriceFromBudgetPhrase, inferGroupSize } from '@/lib/ai/fuzzy-matching';
import { analyzeIntent, type UserContext } from '@/lib/ai/intent-analysis';

export const aiRouter = router({
  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Generate or use existing session ID
      const sessionId = input.sessionId || crypto.randomUUID();
      
      // Upsert conversation session
      await supabase.from('conversation_sessions').upsert({
        id: sessionId,
        user_id: userId,
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });
      
      // Save user message
      await supabase.from('conversation_messages').insert({
        session_id: sessionId,
        user_id: userId,
        message_text: input.message,
        message_type: 'user',
      });

      // Get user's saved places for context
      let savedPlaces: any = { data: null };
      try {
        const result = await supabase.rpc('get_user_saved_destinations', { target_user_id: userId });
        savedPlaces = result;
      } catch (error) {
        console.error('Error fetching saved places:', error);
      }

      // Pre-process query for fuzzy matching
      const budgetInference = inferPriceFromBudgetPhrase(input.message);
      const groupSizeInference = inferGroupSize(input.message);

      // Check for comparative queries
      let comparisonBase = null;
      const likeMatch = input.message.match(/like\s+([^\s]+(?:[^but]*)?)|similar.*to\s+([^\s]+(?:[^but]*)?)/i);
      if (likeMatch) {
        const placeName = (likeMatch[1] || likeMatch[2] || '').trim();
        if (placeName) {
          comparisonBase = await findSimilarPlace(
            placeName,
            (savedPlaces?.data || []) as any[],
            supabase
          );
        }
      }

      // Analyze intent with advanced NLU
      const intent = await analyzeIntent(input.message, {
        savedPlaces: (savedPlaces?.data || []).slice(0, 10).map((sp: any) => ({
          name: sp.name || sp.destination?.name || '',
          city: sp.city || sp.destination?.city || '',
          category: sp.category || sp.destination?.category || '',
          tags: sp.tags || sp.destination?.tags || [],
        })),
        recentVisits: [],
        tasteProfile: undefined,
        comparisonBase,
        budgetInference,
        groupSizeInference,
      });

      // Use semantic query from intent if available, otherwise use original message
      const searchQuery = intent.interpretations?.[0]?.semanticQuery || input.message;

      // Generate embedding for search
      const embedding = await generateDestinationEmbedding({
        name: searchQuery,
        city: intent.interpretations?.[0]?.filters?.city || '',
        category: intent.interpretations?.[0]?.filters?.category || '',
        content: searchQuery,
        tags: intent.interpretations?.[0]?.filters?.tags || [],
      });

      // Apply filters from intent interpretation
      const filters = intent.interpretations?.[0]?.filters || {};
      
      // Hybrid search using the new function
      // Note: This requires migration 024_hybrid_search_function.sql to be run
      let results: any[] = [];
      try {
        const { data, error: searchError } = await supabase
          .rpc('search_destinations_hybrid', {
            query_embedding: `[${embedding.join(',')}]`,
            user_id_param: userId,
            city_filter: filters.city || null,
            category_filter: filters.category || null,
            michelin_only: filters.michelin_preference || false,
            price_max: filters.price_level_max || null,
            rating_min: filters.rating_min || null,
            tags_filter: filters.tags && filters.tags.length > 0 ? filters.tags : null,
            limit_count: 10,
            include_saved_only: filters.include_saved_only || false,
            boost_saved: true,
          });
        
        if (!searchError && data) {
          results = data;
        } else if (searchError) {
          console.error('Hybrid search error:', searchError);
          // Fallback: Use existing match_destinations if hybrid search not available
          try {
            const fallbackResult = await supabase.rpc('match_destinations', {
              query_embedding: embedding,
              match_threshold: 0.6,
              match_count: 10,
              filter_city: filters.city || null,
              filter_category: filters.category || null,
            });
            results = fallbackResult.data || [];
          } catch (fallbackError) {
            console.error('Fallback search error:', fallbackError);
            results = [];
          }
        }
      } catch (error) {
        console.error('Search error:', error);
      }

      // Filter out visited places if requested
      if (filters.exclude_visited) {
        let visitedPlaces: any = { data: null };
        try {
          const result = await supabase.rpc('get_user_visited_destinations', { target_user_id: userId });
          visitedPlaces = result;
        } catch (error) {
          console.error('Error fetching visited places:', error);
        }
        
        const visitedSlugs = new Set((visitedPlaces?.data || []).map((vp: any) => vp.slug));
        results = results.filter((r: any) => !visitedSlugs.has(r.slug));
      }


      // Generate response text with intelligent context
      let responseText: string;

      // If needs clarification
      if (intent.needsClarification && intent.clarifyingQuestions && intent.clarifyingQuestions.length > 0) {
        responseText = `I found some options, but I'd love to narrow it down. ${intent.clarifyingQuestions[0]}`;
      }
      // If no results but had interpretation
      else if (!results?.length && intent.interpretations?.[0]) {
        const filterCity = filters.city ? ` in ${filters.city}` : '';
        const alternatives = intent.alternativeInterpretations?.slice(0, 3).map(alt => `• ${alt}`).join('\n') || 
          '• Being more specific about location or type\n• Adjusting your criteria';
        responseText = `I couldn't find exact matches for "${input.message}"${filterCity}. Try:\n${alternatives}`;
      }
      // Success with results
      else if (results?.length) {
        responseText = `Found ${results.length} place${results.length === 1 ? '' : 's'} matching "${input.message}".`;
        
        // Add interpretation reasoning
        if (intent.reasoning) {
          responseText += `\n\n💡 ${intent.reasoning}`;
        }
      }
      // Fallback
      else {
        responseText = "I can help you find places. Try asking about a specific city, vibe, or occasion.";
      }

      // Save assistant message
      await supabase.from('conversation_messages').insert({
        session_id: sessionId,
        user_id: userId,
        message_text: responseText,
        message_type: 'assistant',
      });

      return { 
        sessionId, 
        response: responseText, 
        results: results || [],
        intent: {
          type: intent.intent,
          confidence: intent.confidence,
          reasoning: intent.reasoning,
          needsClarification: intent.needsClarification,
        },
      };
    }),

  getSuggestedPrompts: protectedProcedure
    .query(async ({ ctx }) => {
      const { supabase, userId } = ctx;
      
      if (!userId) {
        return [];
      }

      // Get user's saved cities
      let savedPlaces: any = { data: null };
      try {
        const result = await supabase.rpc('get_user_saved_destinations', { target_user_id: userId });
        savedPlaces = result;
      } catch (error) {
        console.error('Error fetching saved places:', error);
      }

      const cities = [
        ...new Set(
          ((savedPlaces?.data || []) as any[])
            .map((p: any) => p.city)
            .filter(Boolean)
        )
      ];

      const prompts: string[] = [];

      if (cities.length > 0) {
        prompts.push(`Show me new places in ${cities[0]}`);
      }

      prompts.push(
        'Find Michelin restaurants',
        'Show my saved places',
        'Plan a weekend itinerary',
      );

      return prompts.filter(Boolean);
    }),
});


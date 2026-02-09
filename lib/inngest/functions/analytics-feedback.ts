/**
 * Inngest Functions: Analytics Feedback Loop
 *
 * Captures search quality signals and feeds them back into ranking:
 * - Click-through rate per search query
 * - Dwell time signals
 * - Save/visit conversions after search
 * - Multimodal relevance scoring
 */

import { inngest } from "../client";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Process a batch of search interaction events to update quality signals.
 * Triggered after user interactions are recorded.
 */
export const processSearchFeedback = inngest.createFunction(
  {
    id: "process-search-feedback",
    name: "Process Search Quality Feedback",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { event: "analytics/search-feedback" },
  async ({ event, step }) => {
    const { searchSessionId, userId, query, clickedDestinationIds, savedDestinationIds, searchTier } =
      event.data;

    const supabase = createServiceRoleClient();

    // Step 1: Compute click-through rate for this search
    await step.run("compute-ctr", async () => {
      try {
        await supabase.from("search_quality_signals").insert({
          session_id: searchSessionId,
          user_id: userId || null,
          query,
          search_tier: searchTier,
          clicked_count: clickedDestinationIds?.length || 0,
          saved_count: savedDestinationIds?.length || 0,
          clicked_destination_ids: clickedDestinationIds || [],
          saved_destination_ids: savedDestinationIds || [],
          created_at: new Date().toISOString(),
        });
      } catch {
        // Table might not exist; log and continue
        console.log(
          "[analytics-feedback] search_quality_signals table not found, skipping"
        );
      }
    });

    // Step 2: Update destination relevance scores based on clicks
    if (clickedDestinationIds && clickedDestinationIds.length > 0) {
      await step.run("update-relevance-scores", async () => {
        for (const destId of clickedDestinationIds) {
          // Increment click score (used in search ranking)
          const { data: dest } = await supabase
            .from("destinations")
            .select("search_click_score")
            .eq("id", destId)
            .single();

          if (dest) {
            await supabase
              .from("destinations")
              .update({
                search_click_score: (dest.search_click_score || 0) + 1,
              })
              .eq("id", destId);
          }
        }
      });
    }

    // Step 3: Boost destinations that got saved after search (strong quality signal)
    if (savedDestinationIds && savedDestinationIds.length > 0) {
      await step.run("boost-saved-destinations", async () => {
        for (const destId of savedDestinationIds) {
          const { data: dest } = await supabase
            .from("destinations")
            .select("search_save_score")
            .eq("id", destId)
            .single();

          if (dest) {
            await supabase
              .from("destinations")
              .update({
                search_save_score: (dest.search_save_score || 0) + 3, // 3x weight vs click
              })
              .eq("id", destId);
          }
        }
      });
    }

    return {
      searchSessionId,
      processed: true,
      clickedCount: clickedDestinationIds?.length || 0,
      savedCount: savedDestinationIds?.length || 0,
    };
  }
);

/**
 * Aggregate search quality metrics over a time window.
 * Runs daily to compute per-query and per-tier quality metrics.
 */
export const aggregateSearchQuality = inngest.createFunction(
  {
    id: "aggregate-search-quality",
    name: "Aggregate Search Quality Metrics",
    retries: 1,
  },
  { event: "analytics/aggregate-quality" },
  async ({ event, step }) => {
    const supabase = createServiceRoleClient();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Step 1: Compute overall search quality metrics
    const metrics = await step.run("compute-quality-metrics", async () => {
      try {
        const { data: signals } = await supabase
          .from("search_quality_signals")
          .select("*")
          .gte("created_at", oneDayAgo);

        if (!signals || signals.length === 0) {
          return { totalSearches: 0, avgCTR: 0, avgSaveRate: 0, byTier: {} };
        }

        const totalSearches = signals.length;
        const totalClicks = signals.reduce(
          (sum, s) => sum + (s.clicked_count || 0),
          0
        );
        const totalSaves = signals.reduce(
          (sum, s) => sum + (s.saved_count || 0),
          0
        );

        // Group by search tier
        const byTier: Record<
          string,
          { searches: number; clicks: number; saves: number }
        > = {};
        for (const signal of signals) {
          const tier = signal.search_tier || "unknown";
          if (!byTier[tier]) {
            byTier[tier] = { searches: 0, clicks: 0, saves: 0 };
          }
          byTier[tier].searches++;
          byTier[tier].clicks += signal.clicked_count || 0;
          byTier[tier].saves += signal.saved_count || 0;
        }

        return {
          totalSearches,
          avgCTR: totalClicks / totalSearches,
          avgSaveRate: totalSaves / totalSearches,
          byTier,
          computedAt: new Date().toISOString(),
        };
      } catch {
        return { totalSearches: 0, avgCTR: 0, avgSaveRate: 0, byTier: {} };
      }
    });

    // Step 2: Persist aggregated metrics
    await step.run("persist-metrics", async () => {
      try {
        await supabase.from("data_quality_audits").insert({
          audit_type: "search_quality",
          results: metrics,
          created_at: new Date().toISOString(),
        });
      } catch {
        console.log(
          "[analytics-feedback] Could not persist search quality metrics"
        );
      }
    });

    return metrics;
  }
);

export const analyticsFeedbackFunctions = [
  processSearchFeedback,
  aggregateSearchQuality,
];

/**
 * Inngest Functions: Data Freshness Pipeline
 *
 * Runs on schedules to ensure destination data stays fresh:
 * - Checks for stale enrichment data
 * - Validates data quality (completeness, duplication, confidence)
 * - Triggers re-enrichment when data degrades
 * - Reports freshness metrics for observability
 */

import { inngest } from "../client";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Data freshness audit: checks all destinations for staleness and quality.
 * Intended to run daily via cron trigger.
 */
export const dataFreshnessAudit = inngest.createFunction(
  {
    id: "data-freshness-audit",
    name: "Data Freshness Audit",
    retries: 1,
  },
  { event: "data-freshness/audit" },
  async ({ event, step }) => {
    const supabase = createServiceRoleClient();

    // Step 1: Compute freshness statistics
    const stats = await step.run("compute-freshness-stats", async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Total destinations
      const { count: total } = await supabase
        .from("destinations")
        .select("id", { count: "exact", head: true });

      // Missing descriptions
      const { count: missingDescription } = await supabase
        .from("destinations")
        .select("id", { count: "exact", head: true })
        .or("description.is.null,description.eq.");

      // Missing images
      const { count: missingImage } = await supabase
        .from("destinations")
        .select("id", { count: "exact", head: true })
        .is("image", null);

      // Missing coordinates
      const { count: missingCoords } = await supabase
        .from("destinations")
        .select("id", { count: "exact", head: true })
        .or("latitude.is.null,longitude.is.null");

      // Stale enrichment (>30 days)
      const { count: staleEnrichment } = await supabase
        .from("destinations")
        .select("id", { count: "exact", head: true })
        .or(`enriched_at.is.null,enriched_at.lt.${thirtyDaysAgo}`);

      // Stale embeddings
      const { count: staleEmbeddings } = await supabase
        .from("destinations")
        .select("id", { count: "exact", head: true })
        .or(
          "embedding_version.is.null,embedding_needs_update.eq.true"
        );

      return {
        total: total ?? 0,
        missingDescription: missingDescription ?? 0,
        missingImage: missingImage ?? 0,
        missingCoords: missingCoords ?? 0,
        staleEnrichment: staleEnrichment ?? 0,
        staleEmbeddings: staleEmbeddings ?? 0,
        completenessScore:
          total && total > 0
            ? Math.round(
                ((total -
                  (missingDescription ?? 0) -
                  (missingImage ?? 0) -
                  (missingCoords ?? 0)) /
                  total) *
                  100
              )
            : 0,
        freshnessScore:
          total && total > 0
            ? Math.round(
                ((total - (staleEnrichment ?? 0)) / total) * 100
              )
            : 0,
        auditedAt: now.toISOString(),
      };
    });

    // Step 2: Check for duplicate destinations
    const duplicates = await step.run("check-duplicates", async () => {
      const { data } = await supabase.rpc("find_duplicate_destinations").select("*");
      // If the RPC doesn't exist, fall back gracefully
      return data ?? [];
    });

    // Step 3: Persist audit results
    await step.run("persist-audit", async () => {
      try {
        await supabase.from("data_quality_audits").insert({
          audit_type: "freshness",
          results: {
            ...stats,
            duplicateCount: duplicates.length,
          },
          created_at: new Date().toISOString(),
        });
      } catch {
        // Table might not exist; log and continue
        console.log(
          "[data-freshness] data_quality_audits table not found, skipping persistence"
        );
      }
    });

    // Step 4: Auto-trigger enrichment if freshness is low
    if (stats.freshnessScore < 80) {
      await step.sendEvent("trigger-batch-enrichment", {
        name: "enrichment/batch",
        data: { limit: 50, sources: ["google", "ai"], onlyStale: true },
      });
    }

    // Step 5: Auto-trigger embedding backfill if needed
    if (stats.staleEmbeddings > 10) {
      await step.sendEvent("trigger-embedding-backfill", {
        name: "embeddings/backfill",
        data: { limit: 50 },
      });
    }

    return {
      stats,
      duplicateCount: duplicates.length,
      actions: {
        triggeredEnrichment: stats.freshnessScore < 80,
        triggeredEmbeddingBackfill: stats.staleEmbeddings > 10,
      },
    };
  }
);

/**
 * Trend data refresh: pulls fresh trending data from external sources.
 * Intended to run weekly.
 */
export const refreshTrendData = inngest.createFunction(
  {
    id: "refresh-trend-data",
    name: "Refresh Trend Data",
    retries: 2,
  },
  { event: "data-freshness/refresh-trends" },
  async ({ event, step }) => {
    const supabase = createServiceRoleClient();

    // Step 1: Get cities to refresh
    const cities = await step.run("get-cities", async () => {
      const { data } = await supabase
        .from("destinations")
        .select("city")
        .not("city", "is", null);

      const uniqueCities = [...new Set((data || []).map((d) => d.city))];
      return uniqueCities.slice(0, 20); // Top 20 cities
    });

    // Step 2: Update trend scores based on recent user activity
    await step.run("compute-trend-scores", async () => {
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Count recent interactions per destination
      const { data: interactions } = await supabase
        .from("user_interactions")
        .select("destination_id")
        .gte("created_at", sevenDaysAgo)
        .not("destination_id", "is", null);

      if (!interactions || interactions.length === 0) return;

      // Count occurrences
      const counts = new Map<number, number>();
      for (const i of interactions) {
        if (i.destination_id) {
          counts.set(
            i.destination_id,
            (counts.get(i.destination_id) || 0) + 1
          );
        }
      }

      // Update top trending destinations
      const sorted = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100);

      for (const [destId, count] of sorted) {
        await supabase
          .from("destinations")
          .update({
            trending_score: count,
            trending_updated_at: new Date().toISOString(),
          })
          .eq("id", destId);
      }
    });

    return {
      citiesProcessed: cities.length,
      refreshedAt: new Date().toISOString(),
    };
  }
);

export const dataFreshnessFunctions = [dataFreshnessAudit, refreshTrendData];

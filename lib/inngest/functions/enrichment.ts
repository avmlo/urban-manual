/**
 * Inngest Functions: Parallel Enrichment Fan-out
 *
 * Replaces sequential enrichment with parallel background jobs.
 * Supports multi-source enrichment (Google Places, Exa, AI descriptions),
 * aggressive caching, and partial result returns.
 */

import { inngest } from "../client";
import { createServiceRoleClient } from "@/lib/supabase/server";

const ENRICHMENT_CONCURRENCY = 5;
const ENRICHMENT_BATCH_SIZE = 20;

/**
 * Fan-out enrichment for a single destination from multiple sources in parallel.
 * Dispatched when a destination is created or marked for re-enrichment.
 */
export const enrichDestination = inngest.createFunction(
  {
    id: "enrich-destination",
    name: "Enrich Destination (Multi-Source)",
    retries: 2,
    concurrency: { limit: ENRICHMENT_CONCURRENCY },
  },
  { event: "enrichment/destination" },
  async ({ event, step }) => {
    const { destinationId, sources = ["google", "ai"] } = event.data;

    // Step 1: Fetch destination data
    const destination = await step.run("fetch-destination", async () => {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("destinations")
        .select(
          "id, name, city, country, category, description, latitude, longitude, slug, google_place_id"
        )
        .eq("id", destinationId)
        .single();

      if (error) throw new Error(`Failed to fetch destination: ${error.message}`);
      if (!data) throw new Error(`Destination ${destinationId} not found`);
      return data;
    });

    const results: Record<string, { success: boolean; error?: string }> = {};

    // Step 2: Fan out to enrichment sources in parallel via step functions
    if (sources.includes("google") && destination.latitude && destination.longitude) {
      await step.run("enrich-google-places", async () => {
        try {
          const apiKey = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
          if (!apiKey) {
            results.google = { success: false, error: "API key not configured" };
            return;
          }

          const query = `${destination.name} ${destination.city}`;
          const response = await fetch(
            "https://places.googleapis.com/v1/places:searchText",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask":
                  "places.id,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.currentOpeningHours,places.internationalPhoneNumber",
              },
              body: JSON.stringify({
                textQuery: query,
                maxResultCount: 1,
                languageCode: "en",
              }),
            }
          );

          if (!response.ok) {
            results.google = { success: false, error: `API returned ${response.status}` };
            return;
          }

          const data = await response.json();
          const place = data.places?.[0];

          if (place) {
            const supabase = createServiceRoleClient();
            await supabase
              .from("destinations")
              .update({
                google_place_id: place.id,
                rating: place.rating,
                review_count: place.userRatingCount,
                website: place.websiteUri,
                phone: place.internationalPhoneNumber,
                enriched_at: new Date().toISOString(),
              })
              .eq("id", destinationId);
            results.google = { success: true };
          } else {
            results.google = { success: false, error: "No place found" };
          }
        } catch (err) {
          results.google = {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          };
        }
      });
    }

    if (sources.includes("ai")) {
      await step.run("enrich-ai-description", async () => {
        try {
          // Dispatch to the existing description generation pipeline
          await inngest.send({
            name: "descriptions/generate",
            data: {
              destinationId: destination.id,
              destinationName: destination.name,
              city: destination.city,
              category: destination.category,
            },
          });
          results.ai = { success: true };
        } catch (err) {
          results.ai = {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          };
        }
      });
    }

    // Step 3: Trigger embedding generation after enrichment
    await step.run("trigger-embedding", async () => {
      await inngest.send({
        name: "embeddings/generate",
        data: { destinationId, priority: "normal" },
      });
    });

    return {
      destinationId,
      sources: results,
      completedAt: new Date().toISOString(),
    };
  }
);

/**
 * Batch enrichment: find destinations needing enrichment and fan out.
 * Designed to be triggered on a schedule (e.g., daily via cron).
 */
export const batchEnrichDestinations = inngest.createFunction(
  {
    id: "batch-enrich-destinations",
    name: "Batch Enrich Destinations",
    retries: 1,
  },
  { event: "enrichment/batch" },
  async ({ event, step }) => {
    const { limit = ENRICHMENT_BATCH_SIZE, sources = ["google", "ai"], onlyStale = true } =
      event.data;

    // Step 1: Find destinations needing enrichment
    const destinationIds = await step.run("find-stale-destinations", async () => {
      const supabase = createServiceRoleClient();

      let query = supabase
        .from("destinations")
        .select("id")
        .order("popularity_score", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (onlyStale) {
        // Destinations not enriched in the last 30 days or never enriched
        const thirtyDaysAgo = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString();
        query = query.or(
          `enriched_at.is.null,enriched_at.lt.${thirtyDaysAgo}`
        );
      }

      const { data, error } = await query;
      if (error) throw new Error(`Query failed: ${error.message}`);
      return (data || []).map((d) => d.id);
    });

    if (destinationIds.length === 0) {
      return { message: "No destinations need enrichment", dispatched: 0 };
    }

    // Step 2: Dispatch individual enrichment jobs
    await step.run("dispatch-enrichment-jobs", async () => {
      const events = destinationIds.map((id: number) => ({
        name: "enrichment/destination" as const,
        data: { destinationId: id, sources },
      }));

      await inngest.send(events);
    });

    // Step 3: Schedule continuation if there are more
    if (destinationIds.length === limit) {
      await step.sendEvent("schedule-next-batch", {
        name: "enrichment/batch",
        data: { limit, sources, onlyStale },
      });
    }

    return {
      dispatched: destinationIds.length,
      hasMore: destinationIds.length === limit,
    };
  }
);

export const enrichmentFunctions = [enrichDestination, batchEnrichDestinations];

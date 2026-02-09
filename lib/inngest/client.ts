/**
 * Inngest Client Configuration
 *
 * Central client for all background job processing.
 * Handles embeddings, summaries, taste updates, and itinerary generation.
 */

import { Inngest, EventSchemas } from "inngest";

/**
 * Event type definitions for all background jobs
 */
type Events = {
  // Embedding events
  "embeddings/generate": {
    data: {
      destinationId: number;
      priority?: "high" | "normal" | "low";
    };
  };
  "embeddings/batch": {
    data: {
      destinationIds: number[];
      batchId?: string;
    };
  };
  "embeddings/backfill": {
    data: {
      limit?: number;
      offset?: number;
    };
  };

  // Summary events
  "summaries/generate": {
    data: {
      destinationId: number;
      destinationSlug: string;
      destinationName: string;
      reviews: Array<{ text: string; rating?: number }>;
      callbackUrl?: string;
    };
  };

  // Taste profile events
  "taste/update": {
    data: {
      userId: string;
      interactions: Array<{
        type: "view" | "save" | "visit" | "unsave";
        destinationId: number;
        timestamp: string;
        context?: string;
      }>;
    };
  };
  "taste/sync-mem0": {
    data: {
      userId: string;
    };
  };
  "taste/record-interaction": {
    data: {
      userId: string;
      interaction: {
        type: "view" | "save" | "visit" | "unsave";
        destination: {
          id?: number;
          slug: string;
          name: string;
          city?: string;
          category?: string;
        };
      };
    };
  };

  // Itinerary events
  "itinerary/generate": {
    data: {
      jobId: string;
      userId?: string;
      destination: string;
      dates: {
        start: string;
        end: string;
      };
      preferences?: string[];
      travelStyle?: "relaxed" | "moderate" | "packed";
      budget?: "budget" | "moderate" | "luxury";
      tripId?: string;
      callbackUrl?: string;
    };
  };
  "itinerary/draft-complete": {
    data: {
      jobId: string;
      tripId?: string;
      userId?: string;
      status: "completed" | "failed";
      content?: string;
      error?: string;
    };
  };

  // AI description events
  "descriptions/generate": {
    data: {
      destinationId: number;
      destinationName: string;
      city: string;
      category: string;
    };
  };
  "descriptions/batch": {
    data: {
      limit?: number;
      dryRun?: boolean;
    };
  };

  // Enrichment events (parallel fan-out)
  "enrichment/destination": {
    data: {
      destinationId: number;
      sources?: Array<"google" | "ai" | "exa">;
    };
  };
  "enrichment/batch": {
    data: {
      limit?: number;
      sources?: Array<"google" | "ai" | "exa">;
      onlyStale?: boolean;
    };
  };

  // Data freshness events
  "data-freshness/audit": {
    data: Record<string, never>;
  };
  "data-freshness/refresh-trends": {
    data: Record<string, never>;
  };

  // Analytics feedback events
  "analytics/search-feedback": {
    data: {
      searchSessionId: string;
      userId?: string;
      query: string;
      clickedDestinationIds?: number[];
      savedDestinationIds?: number[];
      searchTier?: string;
    };
  };
  "analytics/aggregate-quality": {
    data: Record<string, never>;
  };
};

/**
 * Inngest client instance
 * Use this to send events and create functions
 */
export const inngest = new Inngest({
  id: "urban-manual",
  schemas: new EventSchemas().fromRecord<Events>(),
});

/**
 * Helper type for event names
 */
export type EventName = keyof Events;

/**
 * Helper type to get event data type
 */
export type EventData<T extends EventName> = Events[T]["data"];

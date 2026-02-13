/**
 * Enrichment Suggestions
 *
 * POST /api/admin/content/enrichment-suggestions
 *
 * Uses Gemini to analyse a destination's existing data and surface
 * actionable enrichment suggestions — e.g. missing links, tags that
 * should be added based on review mentions, architect records that
 * could be connected, etc.
 */

import { NextRequest } from "next/server";
import {
  withAdminAuth,
  createSuccessResponse,
  AdminContext,
} from "@/lib/errors";
import { generateJSONWithGemini, isGeminiAvailable } from "@/lib/gemini";
import {
  calculateQualityScore,
  type QualityScore,
} from "@/lib/admin/quality-scoring";
import type { Destination } from "@/types/destination";

export interface EnrichmentSuggestion {
  type: "tag" | "link" | "field" | "content";
  field?: string;
  suggestion: string;
  confidence: "high" | "medium" | "low";
  source?: string;
}

export interface DestinationEnrichmentResult {
  destinationId: number;
  name: string;
  qualityScore: QualityScore;
  suggestions: EnrichmentSuggestion[];
}

function buildEnrichmentPrompt(dest: Destination): string {
  const reviewTexts = (dest.reviews_json ?? [])
    .slice(0, 5)
    .map((r) => (r as Record<string, string>).text ?? "")
    .filter(Boolean)
    .join("\n---\n");

  return `You are a data-quality editor for a curated travel guide called Urban Manual.
Analyse this destination and suggest specific, actionable enrichment improvements.

Destination:
  Name: ${dest.name}
  City: ${dest.city}
  Category: ${dest.category}
  Description: ${dest.description ?? "(empty)"}
  Micro description: ${dest.micro_description ?? "(empty)"}
  Tags: ${(dest.tags ?? []).join(", ") || "(none)"}
  Architect ID: ${dest.architect_id ?? "(not linked)"}
  Design firm: ${dest.design_firm ?? "(none)"}
  Description mentions: ${dest.description ?? ""}
  Reviews:
${reviewTexts || "(no reviews)"}

For each suggestion, determine:
- type: "tag" (add a tag), "link" (connect to existing record), "field" (fill a missing field), or "content" (improve description/content)
- field: which database field is affected (optional)
- suggestion: human-readable suggestion text
- confidence: "high", "medium", or "low"
- source: what data point led to this suggestion

Return valid JSON:
{
  "suggestions": [
    {
      "type": "tag",
      "suggestion": "Reviews mention 'vegetarian options' — add 'vegetarian' tag",
      "confidence": "high",
      "source": "reviews"
    }
  ]
}

Only include genuinely useful suggestions. Be specific and actionable.`;
}

export const POST = withAdminAuth(
  async (request: NextRequest, { serviceClient }: AdminContext) => {
    if (!isGeminiAvailable()) {
      throw new Error("Gemini API key is not configured");
    }

    const body = await request.json();
    const { destinationIds, batchSize = 5 } = body as {
      destinationIds?: number[];
      batchSize?: number;
    };

    // Fetch full destination data
    let query = serviceClient
      .from("destinations")
      .select("*");

    if (destinationIds && destinationIds.length > 0) {
      query = query.in("id", destinationIds);
    } else {
      // Fetch lowest-quality destinations first
      query = query.limit(batchSize);
    }

    const { data: destinations, error } = await query;
    if (error) throw new Error(`Failed to fetch destinations: ${error.message}`);
    if (!destinations || destinations.length === 0) {
      return createSuccessResponse({
        message: "No destinations found",
        results: [],
      });
    }

    // Sort by quality score ascending so we process worst-quality first
    const scored = destinations
      .map((d) => ({ dest: d as Destination, quality: calculateQualityScore(d as Destination) }))
      .sort((a, b) => a.quality.score - b.quality.score);

    const results: DestinationEnrichmentResult[] = [];
    const errors: string[] = [];

    for (const { dest, quality } of scored) {
      try {
        // Start with rule-based suggestions from the quality score
        const ruleSuggestions: EnrichmentSuggestion[] = quality.missing.map(
          (field) => ({
            type: "field" as const,
            field: field.key as string,
            suggestion: `Missing ${field.label} (worth ${field.weight} quality points)`,
            confidence: field.weight >= 10 ? ("high" as const) : ("medium" as const),
            source: "quality-score",
          })
        );

        // Then ask Gemini for AI-powered suggestions
        let aiSuggestions: EnrichmentSuggestion[] = [];
        try {
          const prompt = buildEnrichmentPrompt(dest);
          const result = await generateJSONWithGemini(prompt, {
            temperature: 0.3,
          });
          if (result && Array.isArray(result.suggestions)) {
            aiSuggestions = result.suggestions;
          }
        } catch {
          // AI suggestions are best-effort; continue with rule-based only
        }

        results.push({
          destinationId: dest.id!,
          name: dest.name,
          qualityScore: quality,
          suggestions: [...ruleSuggestions, ...aiSuggestions],
        });

        // Rate-limit
        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        errors.push(
          `Destination ${dest.id}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return createSuccessResponse({
      message: `Analysed ${results.length} destinations`,
      total: destinations.length,
      processed: results.length,
      results,
      errors,
    });
  }
);

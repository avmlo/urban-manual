/**
 * Auto-Tag Destinations
 *
 * POST /api/admin/content/auto-tag
 *
 * Uses Gemini to analyse destination data (category, description, reviews)
 * and generate relevant tags.  Returns suggested tags for admin approval —
 * nothing is written to the database until the admin confirms.
 */

import { NextRequest } from "next/server";
import {
  withAdminAuth,
  createSuccessResponse,
  AdminContext,
} from "@/lib/errors";
import { generateJSONWithGemini, isGeminiAvailable } from "@/lib/gemini";

interface TagSuggestion {
  destinationId: number;
  name: string;
  currentTags: string[];
  suggestedTags: string[];
  reasoning: string;
}

/**
 * Build a prompt that instructs Gemini to return tags as JSON.
 */
function buildTagPrompt(
  destination: {
    name: string;
    city: string;
    category: string;
    description?: string | null;
    micro_description?: string | null;
    reviews_json?: Array<Record<string, unknown>> | null;
    tags?: string[] | null;
  }
): string {
  const reviewSnippets = (destination.reviews_json ?? [])
    .slice(0, 5)
    .map((r) => (r as Record<string, string>).text ?? "")
    .filter(Boolean)
    .join(" | ");

  return `You are a travel editor for a curated city guide called Urban Manual.
Analyse the following destination data and suggest up to 8 relevant tags.

Tags should be lowercase, short (1-3 words) and cover aspects like:
- Vibe: "romantic", "lively", "intimate", "family-friendly"
- Features: "outdoor seating", "rooftop", "pet-friendly", "live music"
- Design: "design-forward", "minimalist", "historic", "art-deco"
- Food/Drink: "natural wine", "cocktails", "vegetarian", "brunch"
- Experience: "worth-the-wait", "hidden-gem", "iconic", "local-favourite"

Do NOT repeat tags the destination already has.

Destination:
  Name: ${destination.name}
  City: ${destination.city}
  Category: ${destination.category}
  Description: ${destination.description ?? "(none)"}
  Micro description: ${destination.micro_description ?? "(none)"}
  Existing tags: ${(destination.tags ?? []).join(", ") || "(none)"}
  Review snippets: ${reviewSnippets || "(none)"}

Return valid JSON in this exact shape:
{
  "suggestedTags": ["tag1", "tag2"],
  "reasoning": "Brief explanation of why these tags were chosen"
}`;
}

export const POST = withAdminAuth(
  async (request: NextRequest, { serviceClient }: AdminContext) => {
    if (!isGeminiAvailable()) {
      throw new Error("Gemini API key is not configured");
    }

    const body = await request.json();
    const {
      destinationIds,
      batchSize = 10,
      applyDirectly = false,
    } = body as {
      destinationIds?: number[];
      batchSize?: number;
      applyDirectly?: boolean;
    };

    // Fetch destinations — either by explicit IDs or the first N without tags
    let query = serviceClient
      .from("destinations")
      .select(
        "id, name, city, category, description, micro_description, reviews_json, tags"
      );

    if (destinationIds && destinationIds.length > 0) {
      query = query.in("id", destinationIds);
    } else {
      // Prioritise destinations with no tags
      query = query
        .or("tags.is.null,tags.eq.{}")
        .limit(batchSize);
    }

    const { data: destinations, error } = await query;
    if (error) throw new Error(`Failed to fetch destinations: ${error.message}`);
    if (!destinations || destinations.length === 0) {
      return createSuccessResponse({
        message: "No destinations need tagging",
        suggestions: [],
      });
    }

    const suggestions: TagSuggestion[] = [];
    const errors: string[] = [];

    for (const dest of destinations) {
      try {
        const prompt = buildTagPrompt(dest);
        const result = await generateJSONWithGemini(prompt, {
          temperature: 0.3,
        });

        if (!result || !Array.isArray(result.suggestedTags)) {
          errors.push(`Destination ${dest.id}: Invalid AI response`);
          continue;
        }

        const suggestedTags: string[] = result.suggestedTags
          .map((t: string) => t.toLowerCase().trim())
          .filter(
            (t: string) => t && !(dest.tags ?? []).includes(t)
          );

        if (applyDirectly && suggestedTags.length > 0) {
          const mergedTags = [...new Set([...(dest.tags ?? []), ...suggestedTags])];
          const { error: updateErr } = await serviceClient
            .from("destinations")
            .update({ tags: mergedTags })
            .eq("id", dest.id);
          if (updateErr) {
            errors.push(`Destination ${dest.id}: DB update failed — ${updateErr.message}`);
          }
        }

        suggestions.push({
          destinationId: dest.id,
          name: dest.name,
          currentTags: dest.tags ?? [],
          suggestedTags,
          reasoning: result.reasoning ?? "",
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
      message: applyDirectly ? "Tags generated and applied" : "Tag suggestions ready for review",
      total: destinations.length,
      processed: suggestions.length,
      suggestions,
      errors,
    });
  }
);

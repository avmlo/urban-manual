/**
 * Data Quality Scoring Module
 *
 * Calculates a 0-100 quality score for each destination based on field
 * completeness.  Weights are tuned so that the most impactful editorial
 * fields (image, description, architect data) carry the most points.
 */

import type { Destination } from "@/types/destination";

// ---------------------------------------------------------------------------
// Scoring configuration
// ---------------------------------------------------------------------------

export interface FieldWeight {
  key: keyof Destination;
  weight: number;
  label: string;
  /** Human-readable description of what counts as "present" */
  description: string;
}

/**
 * Authoritative weight table — weights sum to exactly 100.
 *
 * | Category              | Points |
 * |-----------------------|--------|
 * | Visual (image)        |   15   |
 * | Descriptions          |   20   |
 * | Coordinates           |   10   |
 * | Contact & enrichment  |   20   |
 * | Reviews & ratings     |   10   |
 * | Architecture          |   15   |
 * | Metadata & tags       |   10   |
 */
export const QUALITY_WEIGHTS: FieldWeight[] = [
  // Visual
  { key: "image", weight: 15, label: "Image", description: "Has a primary image" },

  // Descriptions
  { key: "description", weight: 10, label: "Description", description: "Has a description" },
  { key: "micro_description", weight: 10, label: "Micro description", description: "Has a short card description" },

  // Location
  { key: "latitude", weight: 5, label: "Coordinates", description: "Has latitude" },
  { key: "longitude", weight: 5, label: "Coordinates", description: "Has longitude" },

  // Contact / enrichment
  { key: "opening_hours_json", weight: 10, label: "Opening hours", description: "Has opening hours data" },
  { key: "website", weight: 5, label: "Website", description: "Has a website URL" },
  { key: "phone_number", weight: 5, label: "Phone number", description: "Has a phone number" },

  // Reviews & rating
  { key: "reviews_json", weight: 5, label: "Reviews", description: "Has Google reviews" },
  { key: "rating", weight: 5, label: "Rating", description: "Has a rating" },

  // Architecture
  { key: "architect_id", weight: 10, label: "Architect linked", description: "Linked to an architect record" },
  { key: "architectural_significance", weight: 5, label: "Architectural significance", description: "Has significance text" },

  // Tags & metadata
  { key: "tags", weight: 10, label: "Tags", description: "Has at least one tag" },
];

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

function fieldIsPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0) return false;
  return true;
}

export interface FieldResult {
  key: keyof Destination;
  label: string;
  weight: number;
  present: boolean;
}

export interface QualityScore {
  /** 0-100 integer score */
  score: number;
  /** Per-field breakdown */
  fields: FieldResult[];
  /** Fields that are missing (present === false) */
  missing: FieldResult[];
}

/**
 * Calculate the quality score for a single destination.
 */
export function calculateQualityScore(destination: Destination): QualityScore {
  const fields: FieldResult[] = QUALITY_WEIGHTS.map(({ key, weight, label }) => ({
    key,
    label,
    weight,
    present: fieldIsPresent(destination[key]),
  }));

  const score = fields.reduce((sum, f) => sum + (f.present ? f.weight : 0), 0);
  const missing = fields.filter((f) => !f.present);

  return { score, fields, missing };
}

/**
 * Calculate quality scores for a batch of destinations.
 * Returns them sorted by score ascending (worst first) so admins can
 * prioritise enrichment.
 */
export function calculateBatchQualityScores(
  destinations: Destination[]
): Array<{ destination: Destination; quality: QualityScore }> {
  return destinations
    .map((destination) => ({
      destination,
      quality: calculateQualityScore(destination),
    }))
    .sort((a, b) => a.quality.score - b.quality.score);
}

/**
 * Get a human-readable label for a quality score.
 */
export function getQualityLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 30) return "Poor";
  return "Critical";
}

/**
 * Get a Tailwind colour class for the score (text colour).
 */
export function getQualityColor(score: number): string {
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Get a Tailwind background class for a progress bar segment.
 */
export function getQualityBarColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-gray-300 dark:bg-gray-600";
}

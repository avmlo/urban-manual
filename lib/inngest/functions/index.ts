/**
 * Inngest Functions Index
 *
 * Exports all background job functions for registration with Inngest.
 */

export { embeddingFunctions } from "./embeddings";
export { summaryFunctions } from "./summaries";
export { tasteProfileFunctions } from "./taste-profile";
export { itineraryFunctions } from "./itinerary";
export { enrichmentFunctions } from "./enrichment";
export { dataFreshnessFunctions } from "./data-freshness";
export { analyticsFeedbackFunctions } from "./analytics-feedback";

// Combined export for API route
import { embeddingFunctions } from "./embeddings";
import { summaryFunctions } from "./summaries";
import { tasteProfileFunctions } from "./taste-profile";
import { itineraryFunctions } from "./itinerary";
import { enrichmentFunctions } from "./enrichment";
import { dataFreshnessFunctions } from "./data-freshness";
import { analyticsFeedbackFunctions } from "./analytics-feedback";

export const allFunctions = [
  ...embeddingFunctions,
  ...summaryFunctions,
  ...tasteProfileFunctions,
  ...itineraryFunctions,
  ...enrichmentFunctions,
  ...dataFreshnessFunctions,
  ...analyticsFeedbackFunctions,
];

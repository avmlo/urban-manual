/**
 * Public API utilities
 *
 * Single import for route handlers:
 *   import { withStandardApi, createSuccessResponse } from '@/lib/api';
 */

export {
  withStandardApi,
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createRateLimitError,
  type RateLimitTier,
  type AuthLevel,
  type StandardApiContext,
  type StandardApiOptions,
} from "./middleware";

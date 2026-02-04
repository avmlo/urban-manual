/**
 * API route error handling wrapper
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, handleSupabaseError } from './handlers';
import { CustomError } from './types';

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandling(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('[API Error]', error);
      
      // Handle CustomError
      if (error instanceof CustomError) {
        return createErrorResponse(error);
      }

      // Handle Supabase errors
      if (error && typeof error === 'object' && 'code' in error) {
        const supabaseError = handleSupabaseError(error);
        return createErrorResponse(supabaseError);
      }

      // Handle other errors
      return createErrorResponse(error);
    }
  };
}

/**
 * Handle async errors in API routes
 */
export async function handleApiError(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    console.error('[API Error]', error);
    return createErrorResponse(error);
  }
}


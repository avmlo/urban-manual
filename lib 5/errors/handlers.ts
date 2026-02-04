/**
 * Error handling utilities
 */

import { NextResponse } from 'next/server';
import { ErrorCode, CustomError } from './types';

interface StandardResponse<TData> {
  success: boolean;
  data: TData | null;
  meta: Record<string, any> | null;
  errors: Array<{
    message: string;
    code: ErrorCode;
    details?: any;
  }>;
}

type SuccessMeta = Record<string, any> | null;

export function createSuccessResponse<TData>(
  data: TData,
  meta: SuccessMeta = null,
  status: number = 200
): NextResponse<StandardResponse<TData>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
      errors: [],
    },
    { status }
  );
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: Error | CustomError | unknown,
  defaultMessage: string = 'An error occurred'
): NextResponse<StandardResponse<null>> {
  // Handle CustomError
  if (error instanceof CustomError) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: null,
        errors: [
          {
            message: error.message,
            code: error.code,
            details: error.details,
          },
        ],
      },
      { status: error.statusCode }
    );
  }

  // Handle standard Error
  if (error instanceof Error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        meta: null,
        errors: [
          {
            message: error.message || defaultMessage,
            code: ErrorCode.INTERNAL_SERVER_ERROR,
          },
        ],
      },
      { status: 500 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      success: false,
      data: null,
      meta: null,
      errors: [
        {
          message: defaultMessage,
          code: ErrorCode.INTERNAL_SERVER_ERROR,
        },
      ],
    },
    { status: 500 }
  );
}

/**
 * Handle Supabase errors
 */
export function handleSupabaseError(error: any): CustomError {
  // Handle specific Supabase error codes
  if (error.code === '23505') {
    return new CustomError(
      ErrorCode.DUPLICATE_RESOURCE,
      'A resource with this identifier already exists',
      409,
      { originalError: error.message }
    );
  }

  if (error.code === 'PGRST116') {
    return new CustomError(
      ErrorCode.NOT_FOUND,
      'Resource not found',
      404,
      { originalError: error.message }
    );
  }

  if (error.code === 'PGRST301' || error.message?.includes('RLS')) {
    return new CustomError(
      ErrorCode.FORBIDDEN,
      'Permission denied. Please check your account permissions.',
      403,
      { originalError: error.message }
    );
  }

  // Default Supabase error
  return new CustomError(
    ErrorCode.DATABASE_ERROR,
    'Database operation failed',
    500,
    { originalError: error.message }
  );
}

/**
 * Create validation error
 */
export function createValidationError(
  message: string,
  details?: Record<string, string[]>
): CustomError {
  return new CustomError(
    ErrorCode.VALIDATION_ERROR,
    message,
    400,
    details
  );
}

/**
 * Create not found error
 */
export function createNotFoundError(resource: string = 'Resource'): CustomError {
  return new CustomError(
    ErrorCode.NOT_FOUND,
    `${resource} not found`,
    404
  );
}

/**
 * Create unauthorized error
 */
export function createUnauthorizedError(message: string = 'Unauthorized'): CustomError {
  return new CustomError(
    ErrorCode.UNAUTHORIZED,
    message,
    401
  );
}

/**
 * Create rate limit error
 */
export function createRateLimitError(
  message: string = 'Rate limit exceeded. Please try again later.'
): CustomError {
  return new CustomError(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    message,
    429
  );
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown): string {
  if (error instanceof CustomError) {
    return `[${error.code}] ${error.message}${error.details ? ` - ${JSON.stringify(error.details)}` : ''}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}


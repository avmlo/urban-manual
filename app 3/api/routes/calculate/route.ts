import { NextRequest } from 'next/server';

import { calculateRoute } from '@/lib/enrichment/routes';
import {
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
  withErrorHandling,
} from '@/lib/errors';

type RouteRequestBody = {
  origin?: { lat: number; lng: number } | string;
  destination?: { lat: number; lng: number } | string;
  mode?: 'walking' | 'driving' | 'transit' | 'bicycling';
  waypoints?: Array<{ lat: number; lng: number } | string>;
};

const buildValidationErrors = (body: RouteRequestBody) => {
  const details: Record<string, string[]> = {};

  if (!body.origin) {
    details.origin = ['Origin is required'];
  }

  if (!body.destination) {
    details.destination = ['Destination is required'];
  }

  return details;
};

type CreateHandlerDeps = {
  calculateRoute: typeof calculateRoute;
};

export const createCalculateRouteHandler = (
  deps: CreateHandlerDeps = { calculateRoute }
) =>
  withErrorHandling(async (request: NextRequest) => {
    const body: RouteRequestBody = await request.json();
    const { origin, destination, mode = 'walking', waypoints } = body;

    const validationErrors = buildValidationErrors(body);
    if (Object.keys(validationErrors).length > 0) {
      throw createValidationError('Origin and destination are required', validationErrors);
    }

    const route = await deps.calculateRoute(origin!, destination!, mode, waypoints);

    if (!route) {
      throw createNotFoundError('Route');
    }

    return createSuccessResponse(route, {
      mode,
      waypointCount: waypoints?.length ?? 0,
    });
  });

export const POST = createCalculateRouteHandler();

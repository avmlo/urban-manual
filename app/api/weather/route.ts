/**
 * API Route: Get weather for a location
 * GET /api/weather?lat=...&lng=...
 */

import { NextRequest } from 'next/server';
import { fetchWeather } from '@/lib/enrichment/weather';
import {
  withStandardApi,
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
} from '@/lib/api';

export const GET = withStandardApi(
  { rateLimit: 'api', auth: 'none', routeName: '/api/weather' },
  async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');

    if (latParam === null || lngParam === null) {
      throw createValidationError('Latitude and longitude are required');
    }

    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw createValidationError('Invalid latitude or longitude values');
    }

    const weather = await fetchWeather(lat, lng);

    if (!weather) {
      throw createNotFoundError('Weather data');
    }

    return createSuccessResponse(weather);
  }
);

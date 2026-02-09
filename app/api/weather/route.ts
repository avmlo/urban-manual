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
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    if (!lat || !lng) {
      throw createValidationError('Latitude and longitude are required');
    }

    const weather = await fetchWeather(lat, lng);

    if (!weather) {
      throw createNotFoundError('Weather data');
    }

    return createSuccessResponse(weather);
  }
);

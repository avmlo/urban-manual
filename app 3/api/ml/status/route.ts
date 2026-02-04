/**
 * ML Service Status
 *
 * Check the status of the ML microservice.
 */

import { NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const HEALTH_ENDPOINT = `${ML_SERVICE_URL}/api/health`;
const RECOMMEND_STATUS_ENDPOINT = `${ML_SERVICE_URL}/api/recommendations/model/status`;
const FORECAST_STATUS_ENDPOINT = `${ML_SERVICE_URL}/api/forecast/status`;

async function fetchJson(url: string, timeoutMs = 3000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function GET() {
  try {
    // Check health endpoint
    const healthData = await fetchJson(HEALTH_ENDPOINT);

    // Get model statuses
    const [recommendStatus, forecastStatus] = await Promise.allSettled([
      fetchJson(RECOMMEND_STATUS_ENDPOINT),
      fetchJson(FORECAST_STATUS_ENDPOINT)
    ]);

    return NextResponse.json({
      status: 'healthy',
      ml_service: 'available',
      health: healthData,
      models: {
        recommendations: recommendStatus.status === 'fulfilled' ? recommendStatus.value : { status: 'error' },
        forecasting: forecastStatus.status === 'fulfilled' ? forecastStatus.value : { status: 'error' }
      }
    });

  } catch (error) {
    console.error('ML status check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        ml_service: 'unavailable',
        error: 'Connection failed'
      },
      { status: 503 }
    );
  }
}

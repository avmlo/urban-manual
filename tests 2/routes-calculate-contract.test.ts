import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { createCalculateRouteHandler } from '@/app/api/routes/calculate/route';

type RouteShape = {
  distanceMeters: number;
  duration: string;
  durationSeconds: number;
  legs: Array<Record<string, unknown>>;
  polyline?: string;
};

const buildRequest = (body: Record<string, unknown>) =>
  new NextRequest(
    new Request('http://localhost/api/routes/calculate', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  );

async function testSuccessContract() {
  const mockRoute: RouteShape = {
    distanceMeters: 5000,
    duration: '20 mins',
    durationSeconds: 1200,
    legs: [],
    polyline: 'encoded_polyline',
  };

  const handler = createCalculateRouteHandler({
    calculateRoute: async () => mockRoute,
  });

  const response = await handler(
    buildRequest({ origin: 'Tokyo Tower', destination: 'Shibuya' })
  );
  const payload = await response.json();

  assert.equal(response.status, 200, 'success responses should use HTTP 200');
  assert.deepEqual(payload, {
    success: true,
    data: mockRoute,
    meta: { mode: 'walking', waypointCount: 0 },
    errors: [],
  });
}

async function testValidationContract() {
  const handler = createCalculateRouteHandler({
    // this should never be called because validation fails first
    calculateRoute: async () => {
      throw new Error('should not be called');
    },
  });

  const response = await handler(buildRequest({ destination: 'Shibuya' }));
  const payload = await response.json();

  assert.equal(response.status, 400, 'validation errors should use HTTP 400');
  assert.equal(payload.success, false);
  assert.equal(payload.data, null);
  assert.equal(payload.meta, null);
  assert.ok(Array.isArray(payload.errors) && payload.errors.length === 1);
  assert.equal(payload.errors[0].code, 'VALIDATION_ERROR');
  assert.deepEqual(payload.errors[0].details, {
    origin: ['Origin is required'],
  });
}

async function run() {
  await testSuccessContract();
  await testValidationContract();
  console.log('Route contract tests passed');
}

run().catch(error => {
  console.error('Route contract tests failed');
  console.error(error);
  process.exit(1);
});

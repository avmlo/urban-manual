import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { createHomepageProfileHandler } from '@/app/api/homepage/profile/route';
import { createHomepageVisitedHandler } from '@/app/api/homepage/visited/route';
import { createHomepageFiltersHandler } from '@/app/api/homepage/filters/route';
import { createHomepageDestinationsHandler } from '@/app/api/homepage/destinations/route';
import type { Destination } from '@/types/destination';

const buildRequest = (path: string) =>
  new NextRequest(new Request(`http://localhost${path}`));

async function testProfileHandlers() {
  const unauthorizedHandler = createHomepageProfileHandler({
    getCurrentUserId: async () => null,
    loadProfile: async () => ({}) as any,
  });

  const unauthorizedResponse = await unauthorizedHandler(buildRequest('/api/homepage/profile'));
  assert.equal(unauthorizedResponse.status, 401, 'unauthorized profile requests should return 401');

  const payloadHandler = createHomepageProfileHandler({
    getCurrentUserId: async () => 'user-123',
    loadProfile: async (userId: string) => ({
      user_id: userId,
      favorite_cities: ['Tokyo'],
      favorite_categories: ['Coffee'],
      privacy_mode: false,
      allow_tracking: true,
      email_notifications: true,
      id: 'profile-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }) as any,
  });

  const okResponse = await payloadHandler(buildRequest('/api/homepage/profile'));
  assert.equal(okResponse.status, 200);
  const okPayload = await okResponse.json();
  assert.equal(okPayload.success, true);
  assert.equal(okPayload.profile.user_id, 'user-123');

  const emptyHandler = createHomepageProfileHandler({
    getCurrentUserId: async () => 'user-123',
    loadProfile: async () => null,
  });
  const emptyResponse = await emptyHandler(buildRequest('/api/homepage/profile'));
  assert.equal(emptyResponse.status, 200);
  const emptyPayload = await emptyResponse.json();
  assert.equal(emptyPayload.profile, null);
}

async function testVisitedHandlers() {
  const unauthorizedHandler = createHomepageVisitedHandler({
    getCurrentUserId: async () => null,
    loadVisitedSlugs: async () => ['tokyo'],
  });
  const unauthorizedResponse = await unauthorizedHandler(buildRequest('/api/homepage/visited'));
  assert.equal(unauthorizedResponse.status, 401, 'unauthorized visited requests should return 401');

  const okHandler = createHomepageVisitedHandler({
    getCurrentUserId: async () => 'user-456',
    loadVisitedSlugs: async () => ['tokyo-tower', 'shibuya-crossing'],
  });
  const okResponse = await okHandler(buildRequest('/api/homepage/visited'));
  assert.equal(okResponse.status, 200);
  const okPayload = await okResponse.json();
  assert.deepEqual(okPayload.slugs, ['tokyo-tower', 'shibuya-crossing']);
}

async function testFilterHandlers() {
  const okHandler = createHomepageFiltersHandler({
    loadFilterRows: async () => [
      { city: 'Tokyo', category: 'Coffee' },
      { city: 'Seoul', category: 'Dessert' },
    ],
  });
  const okResponse = await okHandler(buildRequest('/api/homepage/filters'));
  assert.equal(okResponse.status, 200);
  const okPayload = await okResponse.json();
  assert.equal(okPayload.success, true);
  assert.equal(okPayload.rows.length, 2);

  const emptyHandler = createHomepageFiltersHandler({
    loadFilterRows: async () => [],
  });
  const emptyResponse = await emptyHandler(buildRequest('/api/homepage/filters'));
  assert.equal(emptyResponse.status, 200);
  const emptyPayload = await emptyResponse.json();
  assert.deepEqual(emptyPayload.rows, []);

  const errorHandler = createHomepageFiltersHandler({
    loadFilterRows: async () => {
      throw new Error('boom');
    },
  });
  const errorResponse = await errorHandler(buildRequest('/api/homepage/filters'));
  assert.equal(errorResponse.status, 500);
}

async function testDestinationHandlers() {
  const destinations: Destination[] = [
    {
      slug: 'tokyo-tower',
      name: 'Tokyo Tower',
      city: 'Tokyo',
      category: 'Landmark',
    },
  ];
  const okHandler = createHomepageDestinationsHandler({
    loadDestinations: async () => destinations,
  });
  const okResponse = await okHandler(buildRequest('/api/homepage/destinations'));
  assert.equal(okResponse.status, 200);
  const okPayload = await okResponse.json();
  assert.deepEqual(okPayload.destinations, destinations);

  const errorHandler = createHomepageDestinationsHandler({
    loadDestinations: async () => {
      throw new Error('boom');
    },
  });
  const errorResponse = await errorHandler(buildRequest('/api/homepage/destinations'));
  assert.equal(errorResponse.status, 500);
}

async function run() {
  await testProfileHandlers();
  await testVisitedHandlers();
  await testFilterHandlers();
  await testDestinationHandlers();
  console.log('Homepage loader route tests passed');
}

run().catch(error => {
  console.error('Homepage loader route tests failed');
  console.error(error);
  process.exit(1);
});

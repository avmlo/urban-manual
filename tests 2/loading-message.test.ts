import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getContextAwareLoadingMessage,
  type LoadingIntent,
  type SeasonalContext,
} from '@/src/lib/context/loading-message';

const baseQuery = 'weekend plans';
const deterministicRandom = () => 0;

const buildDate = (hour: number) => new Date(2024, 0, 1, hour, 0, 0, 0);

const runMessage = (
  intent?: LoadingIntent | null,
  seasonal?: SeasonalContext | null,
  currentDate: Date = buildDate(9)
) =>
  getContextAwareLoadingMessage(baseQuery, intent, seasonal, null, {
    currentDate,
    random: deterministicRandom,
  });

test('uses time-of-day fallback when no specific context is provided', () => {
  assert.equal(runMessage(null, null, buildDate(9)), 'Starting your day with perfect recommendations...');
  assert.equal(runMessage(null, null, buildDate(15)), 'Finding your perfect afternoon escape...');
  assert.equal(runMessage(null, null, buildDate(20)), 'Discovering evening destinations...');
});

test('prioritizes modifiers when intent contains descriptors', () => {
  const message = runMessage({ modifiers: ['Romantic dinner'] }, null);
  assert.equal(message, 'Finding intimate spots perfect for two...');
});

test('returns seasonal copy when a season is supplied', () => {
  const message = runMessage(null, { season: 'winter' });
  assert.equal(message, 'Finding cozy winter spots...');
});

test('covers category and city specific combinations deterministically', () => {
  const intent: LoadingIntent = { city: 'Paris', category: 'restaurant' };
  const message = runMessage(intent, null);
  assert.equal(message, "Discovering Paris's finest dining...");
});

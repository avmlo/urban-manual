import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert';

// Mocking global.fetch
const originalFetch = global.fetch;

// Import the module after setting up environment if needed, but here it's fine.
import { fetchTrendingData, _trendingCache } from '../../lib/api/trending';

describe('fetchTrendingData', () => {
  beforeEach(() => {
    // Reset cache
    _trendingCache.data = null;
    _trendingCache.timestamp = 0;
    _trendingCache.promise = null;

    // Reset fetch mock
    global.fetch = originalFetch;
  });

  after(() => {
    global.fetch = originalFetch;
  });

  it('should fetch data when cache is empty', async () => {
    let fetchCalled = 0;
    global.fetch = async () => {
      fetchCalled++;
      return {
        ok: true,
        json: async () => ({ trending: [] })
      } as Response;
    };

    await fetchTrendingData();
    assert.strictEqual(fetchCalled, 1);
  });

  it('should reuse in-flight promise', async () => {
    let fetchCalled = 0;
    let resolveFetch: (val: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
    });

    global.fetch = async () => {
      fetchCalled++;
      await fetchPromise; // Wait for manual resolution
      return {
        ok: true,
        json: async () => ({ trending: [] })
      } as Response;
    };

    // Start two requests
    const p1 = fetchTrendingData();
    const p2 = fetchTrendingData();

    // Resolve the fetch
    resolveFetch!(null);

    await Promise.all([p1, p2]);

    assert.strictEqual(fetchCalled, 1, 'Should call fetch only once');
  });

  it('should use cached data', async () => {
    // Populate cache
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _trendingCache.data = { trending: [{ destination_id: 1, trend_direction: 'rising', growth_rate: 10, current_demand: 100, predicted_demand: 110 }] } as any;
    _trendingCache.timestamp = Date.now();

    let fetchCalled = 0;
    global.fetch = async () => {
      fetchCalled++;
      return { ok: true, json: async () => ({}) } as Response;
    };

    const data = await fetchTrendingData();
    assert.strictEqual(fetchCalled, 0);
    assert.strictEqual(data?.trending[0].destination_id, 1);
  });

  it('should retry on error', async () => {
      // First call fails
      let callCount = 0;
      global.fetch = async () => {
          callCount++;
          if (callCount === 1) {
              return { ok: false } as Response;
          }
          return {
              ok: true,
              json: async () => ({ trending: [] })
          } as Response;
      };

      try {
        await fetchTrendingData();
        assert.fail('Should have thrown');
      } catch {
          // Expected
      }

      // Should have cleared the promise
      assert.strictEqual(_trendingCache.promise, null);

      // Second call succeeds
      await fetchTrendingData();
      assert.strictEqual(callCount, 2);
  });
});

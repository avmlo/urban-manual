import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import type { SemanticSearchFilters } from '../lib/search/semanticSearch';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-secret';

const semanticModulePromise = import('../lib/search/semanticSearch');
type SemanticSearchModule = typeof import('../lib/search/semanticSearch');
type SearchFn = ReturnType<SemanticSearchModule['createSemanticBlendSearch']>;

type QueryResponse = { data?: any[]; error?: any };

type TestContext = {
  search: SearchFn;
  embedMock: any;
  rpcMock: any;
  fromMock: any;
  asimovSearchMock: any;
  asimovMapMock: any;
  metricMock: any;
  enqueueResponse: (response: QueryResponse) => void;
};

function createQueryBuilder(response?: QueryResponse) {
  const result: any = {
    select: () => result,
    ilike: () => result,
    eq: () => result,
    or: () => result,
    limit: () => result,
    then: (resolve: (value: { data?: any[]; error?: any }) => any) =>
      Promise.resolve(resolve({ data: response?.data ?? [], error: response?.error ?? null })),
  };
  return result;
}

async function createTestContext(): Promise<TestContext> {
  const responses: QueryResponse[] = [];
  const enqueueResponse = (response: QueryResponse) => responses.push(response);
  const embedMock = mock.fn(async () => [] as number[]);
  const rpcMock = mock.fn(async () => ({ data: [], error: null }));
  const fromMock = mock.fn(() => {
    const response = responses.shift() ?? { data: [] };
    return createQueryBuilder(response);
  });
  const asimovSearchMock = mock.fn(async () => null as any);
  const asimovMapMock = mock.fn((results: any[]) => results);
  const metricMock = mock.fn(async () => {});

  const { createSemanticBlendSearch } = await semanticModulePromise;
  const search = createSemanticBlendSearch({
    embed: embedMock as any,
    supabaseClient: {
      rpc: rpcMock,
      from: fromMock,
    } as any,
    asimovSearch: asimovSearchMock as any,
    asimovMapper: asimovMapMock as any,
    metricTracker: metricMock as any,
  });

  return {
    search,
    embedMock,
    rpcMock,
    fromMock,
    asimovSearchMock,
    asimovMapMock,
    metricMock,
    enqueueResponse,
  };
}

function buildFilters(overrides: Partial<SemanticSearchFilters>) {
  return overrides;
}

test('invokes semantic RPC with filters and keeps RPC ranking order', async () => {
  const ctx = await createTestContext();
  ctx.embedMock.mock.mockImplementation(async () => [0.1, 0.2]);
  const rpcData = [
    { slug: 'b', final_score: 0.9, similarity_score: 0.9, image_url: 'b.jpg', is_open_now: true },
    { slug: 'a', final_score: 0.7, similarity_score: 0.7, image_url: 'a.jpg', is_open_now: false },
  ];
  ctx.rpcMock.mock.mockImplementation(async () => ({ data: rpcData, error: null }));

  const results = await ctx.search('Sushi in Tokyo', buildFilters({ city: 'Tokyo', category: 'Restaurant', open_now: true }));

  assert.equal(ctx.rpcMock.mock.calls.length, 1, 'RPC called once');
  const rpcArgs = ctx.rpcMock.mock.calls[0].arguments[1];
  assert.equal(rpcArgs.city_filter, 'Tokyo');
  assert.equal(rpcArgs.category_filter, 'Restaurant');
  assert.equal(rpcArgs.open_now_filter, true);
  assert.equal(results.length, 2);
  assert.equal(results[0].slug, 'b');
  assert.equal(results[0].image, 'b.jpg');
  assert.equal(results[1].slug, 'a');
  assert.equal(ctx.metricMock.mock.calls.length, 0);
});

test('falls back to Asimov when RPC errors and logs metrics', async () => {
  const ctx = await createTestContext();
  ctx.embedMock.mock.mockImplementation(async () => [0.25, 0.5]);
  ctx.rpcMock.mock.mockImplementation(async () => ({ data: null, error: { message: 'rpc broke' } }));
  ctx.asimovSearchMock.mock.mockImplementation(async () => ([{ title: 'Fallback', metadata: { slug: 'asimov' } }]));
  ctx.asimovMapMock.mock.mockImplementation(() => ([{ slug: 'asimov', name: 'Fallback', _asimov_score: 0.8 }]));
  ctx.enqueueResponse({ data: [{ slug: 'asimov', name: 'Fallback' }] });

  const results = await ctx.search('Museums in Paris', buildFilters({ city: 'Paris' }));

  assert.equal(results.length, 1);
  assert.equal(results[0].slug, 'asimov');
  assert.equal(ctx.metricMock.mock.calls.length, 2);
  assert.equal(ctx.metricMock.mock.calls[0].arguments[0], 'vector_failure');
  assert.equal(ctx.metricMock.mock.calls[1].arguments[1].strategy, 'asimov');
  assert.equal(ctx.asimovSearchMock.mock.calls.length, 1);
});

test('falls back to keyword search when Asimov has no data', async () => {
  const ctx = await createTestContext();
  ctx.embedMock.mock.mockImplementation(async () => [0.4, 0.2]);
  ctx.rpcMock.mock.mockImplementation(async () => ({ data: null, error: { message: 'rpc broke' } }));
  ctx.asimovSearchMock.mock.mockImplementation(async () => null);
  ctx.enqueueResponse({ data: [{ slug: 'keyword', name: 'Keyword Result', content: 'Match' }] });

  const results = await ctx.search('Hidden bars', buildFilters({ category: 'Bar', open_now: true }));

  assert.equal(results.length, 1);
  assert.equal(results[0].slug, 'keyword');
  assert.equal(ctx.metricMock.mock.calls.length, 2);
  assert.equal(ctx.metricMock.mock.calls[1].arguments[0], 'vector_fallback');
  assert.equal(ctx.metricMock.mock.calls[1].arguments[1].strategy, 'keyword');
  assert.equal(ctx.asimovSearchMock.mock.calls.length, 1);
});

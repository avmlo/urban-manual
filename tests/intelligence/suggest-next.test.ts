import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  then: undefined as any,
};

// Make it thenable
mockSupabase.then = (resolve: any) => resolve({ data: [], error: null });

// Mock createServiceRoleClient
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => mockSupabase,
}));

// Mock rate limiting
vi.mock('@/lib/rate-limit', () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
  searchRatelimit: {},
  memorySearchRatelimit: {},
}));

import { POST } from '@/app/api/intelligence/suggest-next/route';

describe('POST /api/intelligence/suggest-next', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.ilike.mockReturnThis();
    mockSupabase.not.mockReturnThis();
    mockSupabase.order.mockReturnThis();
    mockSupabase.limit.mockReturnThis();
    mockSupabase.in.mockReturnThis(); // chainable
    // For the separate await supabase.from(...).select(...).in(...) call:
    // We need to handle that it might return a promise differently if awaited directly?
    // In the code:
    // const { data: currentDestinations } = await supabase.from('destinations').select('category').in('slug', currentItems);
    // So .in() needs to be awaitable (return the mockSupabase which is thenable)

    // And for the main query:
    // let query = supabase...
    // const { data: suggestions, error } = await query;
  });

  it('sanitizes input city and uses array for not-in filter', async () => {
    const body = {
      city: 'Paris%', // Malicious input with wildcard
      currentItems: ['slug1', 'slug2'],
      timeOfDay: 'morning'
    };

    const req = new NextRequest('http://localhost/api/intelligence/suggest-next', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    await POST(req);

    // Verify sanitization
    // sanitizeForIlike('Paris%') should escape the % -> 'Paris\%'
    // The code wraps it in %...% -> '%Paris\%%'
    // The original code passed '%Paris%%'
    // We expect the fix to pass '%Paris\%%'
    expect(mockSupabase.ilike).toHaveBeenCalledWith('city', '%Paris\\%%');

    // Verify .not usage
    // The original code passed a string: `("slug1","slug2")`
    // We expect the fix to pass the array directly
    expect(mockSupabase.not).toHaveBeenCalledWith('slug', 'in', ['slug1', 'slug2']);
  });
});

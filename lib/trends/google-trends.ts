/**
 * Google Trends Integration
 * Fetches trending data from Google Trends API for destinations
 */

// Dynamic import to handle cases where package might not be installed
let googleTrends: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  googleTrends = require('google-trends-api');
} catch (error) {
  console.warn('google-trends-api not installed. Run: npm install google-trends-api');
}

export interface GoogleTrendsData {
  destinationId: number;
  destinationName: string;
  city: string;
  searchInterest: number; // 0-100 scale
  trendDirection: 'rising' | 'stable' | 'falling';
  relatedQueries?: string[];
  lastUpdated: Date;
}

export interface TrendResult {
  value: number;
  formattedValue: string;
  formattedAxisTime?: string;
}

/**
 * Fetch Google Trends data for a destination
 */
export async function fetchGoogleTrends(
  query: string,
  geo?: string,
  timeframe: string = 'today 3-m'
): Promise<{
  interest: number;
  trendDirection: 'rising' | 'stable' | 'falling';
  relatedQueries?: string[];
}> {
  if (!googleTrends) {
    console.warn('google-trends-api not available');
    return {
      interest: 0,
      trendDirection: 'stable',
    };
  }

  try {
    // Fetch interest over time
    const interestData = await googleTrends.interestOverTime({
      keyword: query,
      geo: geo || '',
      startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
      endTime: new Date(),
    });

    const parsed = JSON.parse(interestData);
    const timelineData = parsed.default?.timelineData || [];

    if (timelineData.length === 0) {
      return {
        interest: 0,
        trendDirection: 'stable',
      };
    }

    // Calculate average interest
    const values = timelineData.map((d: any) => d.value[0] || 0);
    const avgInterest = values.reduce((a: number, b: number) => a + b, 0) / values.length;

    // Determine trend direction
    const recentValues = values.slice(-7); // Last 7 data points
    const olderValues = values.slice(-14, -7); // Previous 7 data points
    const recentAvg = recentValues.reduce((a: number, b: number) => a + b, 0) / recentValues.length;
    const olderAvg = olderValues.reduce((a: number, b: number) => a + b, 0) / olderValues.length;

    let trendDirection: 'rising' | 'stable' | 'falling' = 'stable';
    const changePercent = ((recentAvg - olderAvg) / (olderAvg || 1)) * 100;

    if (changePercent > 10) {
      trendDirection = 'rising';
    } else if (changePercent < -10) {
      trendDirection = 'falling';
    }

    // Fetch related queries
    let relatedQueries: string[] = [];
    try {
      const relatedData = await googleTrends.relatedQueries({
        keyword: query,
        geo: geo || '',
      });

      const relatedParsed = JSON.parse(relatedData);
      const rising = relatedParsed.default?.rankedList?.[0]?.rankedKeyword || [];
      relatedQueries = rising.slice(0, 5).map((q: any) => q.query);
    } catch (error) {
      console.warn('Failed to fetch related queries:', error);
    }

    return {
      interest: Math.round(avgInterest),
      trendDirection,
      relatedQueries: relatedQueries.length > 0 ? relatedQueries : undefined,
    };
  } catch (error: any) {
    console.error(`Error fetching Google Trends for "${query}":`, error.message);
    
    // Return default values on error
    return {
      interest: 0,
      trendDirection: 'stable',
    };
  }
}

/**
 * Fetch trends for multiple destinations (batched)
 */
export async function fetchBatchGoogleTrends(
  queries: Array<{ id: number; name: string; city: string }>,
  batchSize: number = 5
): Promise<Map<number, GoogleTrendsData>> {
  const results = new Map<number, GoogleTrendsData>();
  
  // Process in batches to avoid rate limiting
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (query) => {
        try {
          // Create search query: "Destination Name, City"
          const searchQuery = `${query.name}, ${query.city}`;
          
          const trendData = await fetchGoogleTrends(searchQuery, undefined, 'today 3-m');
          
          results.set(query.id, {
            destinationId: query.id,
            destinationName: query.name,
            city: query.city,
            searchInterest: trendData.interest,
            trendDirection: trendData.trendDirection,
            relatedQueries: trendData.relatedQueries,
            lastUpdated: new Date(),
          });
          
          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error fetching trends for ${query.name}:`, error);
        }
      })
    );
    
    // Delay between batches
    if (i + batchSize < queries.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

/**
 * Get city-level trends
 */
export async function fetchCityTrends(city: string): Promise<{
  interest: number;
  trendDirection: 'rising' | 'stable' | 'falling';
  topQueries?: string[];
}> {
  try {
    const searchQuery = `things to do in ${city}`;
    const trendData = await fetchGoogleTrends(searchQuery, undefined, 'today 3-m');
    
    return {
      interest: trendData.interest,
      trendDirection: trendData.trendDirection,
      topQueries: trendData.relatedQueries,
    };
  } catch (error) {
    console.error(`Error fetching city trends for ${city}:`, error);
    return {
      interest: 0,
      trendDirection: 'stable',
    };
  }
}


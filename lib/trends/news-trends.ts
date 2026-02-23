/**
 * News API Integration
 * Fetches news mentions and media coverage for destinations
 */

export interface NewsTrendData {
  destinationId: number;
  destinationName: string;
  city: string;
  articleCount: number;
  sentimentScore: number; // -1 to 1 (negative to positive)
  topSources: string[];
  recentArticles: Array<{
    title: string;
    source: string;
    url: string;
    publishedAt: Date;
    description?: string;
  }>;
  lastUpdated: Date;
}

/**
 * Fetch news mentions for a destination
 * Uses NewsAPI.org (free tier: 100 requests/day)
 */
export async function fetchNewsTrends(
  query: string,
  city?: string,
  apiKey?: string
): Promise<{
  articleCount: number;
  sentimentScore: number;
  topSources: string[];
  recentArticles: Array<{
    title: string;
    source: string;
    url: string;
    publishedAt: Date;
    description?: string;
  }>;
}> {
  if (!apiKey) {
    console.warn('News API key not provided');
    return {
      articleCount: 0,
      sentimentScore: 0,
      topSources: [],
      recentArticles: [],
    };
  }

  try {
    // Search query: "destination name" OR "destination name city"
    const searchQuery = city ? `${query} ${city}` : query;
    
    // NewsAPI.org endpoint
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&sortBy=popularity&language=en&pageSize=20&apiKey=${apiKey}`,
      {
        headers: {
          'User-Agent': 'UrbanManual/1.0',
        },
      }
    );

    if (!response.ok) {
      console.warn(`News API error: ${response.status}`);
      return {
        articleCount: 0,
        sentimentScore: 0,
        topSources: [],
        recentArticles: [],
      };
    }

    const data = await response.json();
    const articles = data.articles || [];

    // Filter articles from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentArticles = articles
      .filter((article: any) => {
        if (!article.publishedAt) return false;
        const publishedDate = new Date(article.publishedAt);
        return publishedDate >= thirtyDaysAgo;
      })
      .map((article: any) => ({
        title: article.title || '',
        source: article.source?.name || 'Unknown',
        url: article.url || '',
        publishedAt: new Date(article.publishedAt),
        description: article.description || undefined,
      }));

    // Count sources
    const sourceCounts = new Map<string, number>();
    recentArticles.forEach((article: any) => {
      const count = sourceCounts.get(article.source) || 0;
      sourceCounts.set(article.source, count + 1);
    });

    const topSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source]) => source);

    // Simple sentiment analysis (keyword-based)
    // Could be enhanced with proper NLP
    const positiveWords = ['amazing', 'beautiful', 'best', 'great', 'wonderful', 'stunning', 'must-visit', 'top'];
    const negativeWords = ['avoid', 'warning', 'dangerous', 'overcrowded', 'disappointing', 'bad'];

    let sentimentScore = 0;
    recentArticles.forEach((article: any) => {
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      const positiveCount = positiveWords.filter(word => text.includes(word)).length;
      const negativeCount = negativeWords.filter(word => text.includes(word)).length;
      sentimentScore += (positiveCount - negativeCount) / recentArticles.length;
    });

    // Normalize to -1 to 1
    sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

    return {
      articleCount: recentArticles.length,
      sentimentScore,
      topSources,
      recentArticles: recentArticles.slice(0, 10), // Top 10 articles
    };
  } catch (error: any) {
    console.error(`Error fetching news trends for "${query}":`, error.message);
    return {
      articleCount: 0,
      sentimentScore: 0,
      topSources: [],
      recentArticles: [],
    };
  }
}

/**
 * Alternative: Use GNews API (free tier available)
 */
export async function fetchGNewsTrends(
  query: string,
  city?: string,
  apiKey?: string
): Promise<{
  articleCount: number;
  sentimentScore: number;
  topSources: string[];
  recentArticles: Array<{
    title: string;
    source: string;
    url: string;
    publishedAt: Date;
    description?: string;
  }>;
}> {
  if (!apiKey) {
    console.warn('GNews API key not provided');
    return {
      articleCount: 0,
      sentimentScore: 0,
      topSources: [],
      recentArticles: [],
    };
  }

  try {
    const searchQuery = city ? `${query} ${city}` : query;
    
    const response = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(searchQuery)}&lang=en&max=20&apikey=${apiKey}`,
      {
        headers: {
          'User-Agent': 'UrbanManual/1.0',
        },
      }
    );

    if (!response.ok) {
      console.warn(`GNews API error: ${response.status}`);
      return {
        articleCount: 0,
        sentimentScore: 0,
        topSources: [],
        recentArticles: [],
      };
    }

    const data = await response.json();
    const articles = data.articles || [];

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentArticles = articles
      .filter((article: any) => {
        if (!article.publishedAt) return false;
        const publishedDate = new Date(article.publishedAt);
        return publishedDate >= thirtyDaysAgo;
      })
      .map((article: any) => ({
        title: article.title || '',
        source: article.source?.name || 'Unknown',
        url: article.url || '',
        publishedAt: new Date(article.publishedAt),
        description: article.description || undefined,
      }));

    const sourceCounts = new Map<string, number>();
    recentArticles.forEach((article: any) => {
      const count = sourceCounts.get(article.source) || 0;
      sourceCounts.set(article.source, count + 1);
    });

    const topSources = Array.from(sourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source]) => source);

    // Simple sentiment analysis
    const positiveWords = ['amazing', 'beautiful', 'best', 'great', 'wonderful', 'stunning'];
    const negativeWords = ['avoid', 'warning', 'dangerous', 'overcrowded', 'disappointing'];

    let sentimentScore = 0;
    recentArticles.forEach((article: any) => {
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      const positiveCount = positiveWords.filter(word => text.includes(word)).length;
      const negativeCount = negativeWords.filter(word => text.includes(word)).length;
      sentimentScore += (positiveCount - negativeCount) / recentArticles.length;
    });

    sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

    return {
      articleCount: recentArticles.length,
      sentimentScore,
      topSources,
      recentArticles: recentArticles.slice(0, 10),
    };
  } catch (error: any) {
    console.error(`Error fetching GNews trends for "${query}":`, error.message);
    return {
      articleCount: 0,
      sentimentScore: 0,
      topSources: [],
      recentArticles: [],
    };
  }
}


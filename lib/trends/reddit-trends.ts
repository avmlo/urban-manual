/**
 * Reddit API Integration
 * Fetches trending discussions and mentions about destinations
 */

export interface RedditTrendData {
  destinationId: number;
  destinationName: string;
  city: string;
  mentionCount: number;
  upvoteScore: number;
  trendingSubreddits: string[];
  recentPosts: Array<{
    title: string;
    subreddit: string;
    score: number;
    url: string;
    created: Date;
  }>;
  lastUpdated: Date;
}

/**
 * Search Reddit for destination mentions
 */
export async function fetchRedditTrends(
  query: string,
  city?: string
): Promise<{
  mentionCount: number;
  upvoteScore: number;
  trendingSubreddits: string[];
  recentPosts: Array<{
    title: string;
    subreddit: string;
    score: number;
    url: string;
    created: Date;
  }>;
}> {
  try {
    // Search query: "destination name" OR "destination name city"
    const searchQueries = city 
      ? [`"${query}"`, `"${query} ${city}"`, `${query} ${city}`]
      : [`"${query}"`, query];

    const allPosts: any[] = [];
    const subredditCounts = new Map<string, number>();

    // Search multiple queries and combine results
    for (const searchQuery of searchQueries) {
      try {
        // Reddit search API (no auth required for public data)
        const response = await fetch(
          `https://www.reddit.com/search.json?q=${encodeURIComponent(searchQuery)}&sort=hot&limit=25&t=week`,
          {
            headers: {
              'User-Agent': 'UrbanManual/1.0',
            },
          }
        );

        if (!response.ok) {
          console.warn(`Reddit API error for query "${searchQuery}": ${response.status}`);
          continue;
        }

        const data = await response.json();
        const posts = data.data?.children || [];

        for (const post of posts) {
          const postData = post.data;
          
          // Filter out very old posts (older than 30 days)
          const postDate = new Date(postData.created_utc * 1000);
          const daysAgo = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysAgo > 30) continue;

          allPosts.push({
            title: postData.title,
            subreddit: postData.subreddit,
            score: postData.score || 0,
            url: `https://reddit.com${postData.permalink}`,
            created: postDate,
          });

          // Count subreddit mentions
          const count = subredditCounts.get(postData.subreddit) || 0;
          subredditCounts.set(postData.subreddit, count + 1);
        }

        // Rate limiting: wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn(`Error fetching Reddit data for "${searchQuery}":`, error);
      }
    }

    // Remove duplicates (by URL)
    const uniquePosts = Array.from(
      new Map(allPosts.map(post => [post.url, post])).values()
    );

    // Sort by score and recency
    uniquePosts.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      return b.created.getTime() - a.created.getTime();
    });

    // Get top trending subreddits
    const trendingSubreddits = Array.from(subredditCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([subreddit]) => subreddit);

    // Calculate total upvote score
    const upvoteScore = uniquePosts.reduce((sum, post) => sum + post.score, 0);

    return {
      mentionCount: uniquePosts.length,
      upvoteScore,
      trendingSubreddits,
      recentPosts: uniquePosts.slice(0, 10), // Top 10 posts
    };
  } catch (error: any) {
    console.error(`Error fetching Reddit trends for "${query}":`, error.message);
    return {
      mentionCount: 0,
      upvoteScore: 0,
      trendingSubreddits: [],
      recentPosts: [],
    };
  }
}

/**
 * Get trending destinations from travel subreddits
 */
export async function getTrendingFromTravelSubreddits(
  subreddits: string[] = ['travel', 'solotravel', 'travelpartners', 'digitalnomad']
): Promise<Array<{ destination: string; score: number; postUrl: string }>> {
  const trending: Array<{ destination: string; score: number; postUrl: string }> = [];

  for (const subreddit of subreddits) {
    try {
      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`,
        {
          headers: {
            'User-Agent': 'UrbanManual/1.0',
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const posts = data.data?.children || [];

      for (const post of posts) {
        const postData = post.data;
        const title = postData.title.toLowerCase();

        // Extract potential destination mentions (simple heuristic)
        // This could be enhanced with NLP
        const destinationPatterns = [
          /(?:going to|visiting|traveling to|in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:travel|trip|visit)/g,
        ];

        for (const pattern of destinationPatterns) {
          const matches = title.matchAll(pattern);
          for (const match of matches) {
            const destination = match[1];
            if (destination && destination.length > 2 && destination.length < 30) {
              trending.push({
                destination,
                score: postData.score || 0,
                postUrl: `https://reddit.com${postData.permalink}`,
              });
            }
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn(`Error fetching from r/${subreddit}:`, error);
    }
  }

  // Aggregate by destination
  const destinationScores = new Map<string, { score: number; postUrl: string }>();
  
  for (const item of trending) {
    const existing = destinationScores.get(item.destination);
    if (existing) {
      existing.score += item.score;
    } else {
      destinationScores.set(item.destination, {
        score: item.score,
        postUrl: item.postUrl,
      });
    }
  }

  return Array.from(destinationScores.entries())
    .map(([destination, data]) => ({
      destination,
      ...data,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}


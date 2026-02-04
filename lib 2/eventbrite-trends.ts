/**
 * Eventbrite API Integration
 * Fetches upcoming events that drive destination trends
 */

export interface EventTrendData {
  destinationId: number;
  destinationName: string;
  city: string;
  upcomingEventCount: number;
  totalEventAttendance: number;
  eventCategories: string[];
  topEvents: Array<{
    name: string;
    startDate: Date;
    attendance: number;
    category: string;
    url: string;
  }>;
  lastUpdated: Date;
}

/**
 * Fetch upcoming events for a destination
 * Eventbrite API v3 (free tier: 5,000 calls/day)
 */
export async function fetchEventbriteTrends(
  city: string,
  apiKey?: string
): Promise<{
  upcomingEventCount: number;
  totalEventAttendance: number;
  eventCategories: string[];
  topEvents: Array<{
    name: string;
    startDate: Date;
    attendance: number;
    category: string;
    url: string;
  }>;
}> {
  if (!apiKey) {
    console.warn('Eventbrite API key not provided');
    return {
      upcomingEventCount: 0,
      totalEventAttendance: 0,
      eventCategories: [],
      topEvents: [],
    };
  }

  try {
    // Search events in the city for next 90 days
    const startDate = new Date();
    const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?location.address=${encodeURIComponent(city)}&start_date.range_start=${startDate.toISOString()}&start_date.range_end=${endDate.toISOString()}&order_by=best&expand=venue,category`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'UrbanManual/1.0',
        },
      }
    );

    if (!response.ok) {
      console.warn(`Eventbrite API error: ${response.status}`);
      return {
        upcomingEventCount: 0,
        totalEventAttendance: 0,
        eventCategories: [],
        topEvents: [],
      };
    }

    const data = await response.json();
    const events = data.events || [];

    // Process events
    const topEvents = events
      .slice(0, 20) // Top 20 events
      .map((event: any) => ({
        name: event.name?.text || 'Untitled Event',
        startDate: new Date(event.start?.utc || event.start?.local),
        attendance: event.capacity || 0,
        category: event.category?.name || 'Other',
        url: event.url || '',
      }))
      .filter((event: any) => event.startDate >= startDate);

    // Count categories
    const categoryCounts = new Map<string, number>();
    topEvents.forEach((event: any) => {
      const count = categoryCounts.get(event.category) || 0;
      categoryCounts.set(event.category, count + 1);
    });

    const eventCategories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    const totalEventAttendance = topEvents.reduce(
      (sum: number, event: any) => sum + event.attendance,
      0
    );

    return {
      upcomingEventCount: topEvents.length,
      totalEventAttendance,
      eventCategories,
      topEvents: topEvents.slice(0, 10), // Top 10 events
    };
  } catch (error: any) {
    console.error(`Error fetching Eventbrite trends for "${city}":`, error.message);
    return {
      upcomingEventCount: 0,
      totalEventAttendance: 0,
      eventCategories: [],
      topEvents: [],
    };
  }
}

/**
 * Check if destination has upcoming high-attendance events
 * This can indicate trending status
 */
export async function hasTrendingEvents(
  city: string,
  minAttendance: number = 1000,
  apiKey?: string
): Promise<boolean> {
  const trends = await fetchEventbriteTrends(city, apiKey);
  
  return trends.topEvents.some(
    event => event.attendance >= minAttendance
  );
}


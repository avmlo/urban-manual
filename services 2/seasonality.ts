/**
 * Seasonality & Peak Interest Intelligence Service
 * Provides seasonal events, peak travel periods, and notable dates for destinations
 */

export interface SeasonalityInfo {
  city: string;
  country?: string;
  event: string;
  description: string;
  start: Date;
  end: Date;
  isRecurring: boolean; // For yearly events like cherry blossoms
  priority: number; // 1-10, higher = more important
  bookingAdvice?: string;
}

/**
 * Seasonality data map
 * Keys are city slugs (lowercase, hyphenated)
 */
const SEASONALITY_DATA: Record<string, SeasonalityInfo[]> = {
  'kyoto': [
    {
      city: 'kyoto',
      country: 'Japan',
      event: 'Cherry Blossom Season',
      description: 'Sakura peak bloom in temples and gardens',
      start: new Date('2025-03-25'),
      end: new Date('2025-04-10'),
      isRecurring: true,
      priority: 10,
      bookingAdvice: 'Ryokan and temple stays fill up quickly',
    },
    {
      city: 'kyoto',
      country: 'Japan',
      event: 'Autumn Foliage',
      description: 'Spectacular autumn colors in Arashiyama and temples',
      start: new Date('2025-11-20'),
      end: new Date('2025-12-05'),
      isRecurring: true,
      priority: 9,
    },
    {
      city: 'kyoto',
      country: 'Japan',
      event: 'Gion Matsuri',
      description: 'Famous month-long festival, peaks July 17',
      start: new Date('2025-07-01'),
      end: new Date('2025-07-31'),
      isRecurring: true,
      priority: 9,
    },
  ],
  'copenhagen': [
    {
      city: 'copenhagen',
      country: 'Denmark',
      event: 'Copenhagen Design Week',
      description: 'Premier design event showcasing Danish and international design',
      start: new Date('2025-06-05'),
      end: new Date('2025-06-10'),
      isRecurring: true,
      priority: 8,
    },
    {
      city: 'copenhagen',
      country: 'Denmark',
      event: 'Copenhagen Jazz Festival',
      description: 'World-class jazz festival',
      start: new Date('2025-07-04'),
      end: new Date('2025-07-13'),
      isRecurring: true,
      priority: 7,
    },
    {
      city: 'copenhagen',
      country: 'Denmark',
      event: 'Christmas Markets',
      description: 'Traditional Christmas markets in Tivoli and city squares',
      start: new Date('2025-11-15'),
      end: new Date('2025-12-23'),
      isRecurring: true,
      priority: 6,
    },
  ],
  'paris': [
    {
      city: 'paris',
      country: 'France',
      event: 'Paris Fashion Week',
      description: 'Fall/Winter collections',
      start: new Date('2025-03-03'),
      end: new Date('2025-03-11'),
      isRecurring: true,
      priority: 7,
    },
    {
      city: 'paris',
      country: 'France',
      event: 'Fête de la Musique',
      description: 'Citywide music festival',
      start: new Date('2025-06-21'),
      end: new Date('2025-06-21'),
      isRecurring: true,
      priority: 6,
    },
    {
      city: 'paris',
      country: 'France',
      event: 'Paris Plages',
      description: 'Temporary beach installations along the Seine',
      start: new Date('2025-07-20'),
      end: new Date('2025-08-18'),
      isRecurring: true,
      priority: 5,
    },
    {
      city: 'paris',
      country: 'France',
      event: 'Christmas Markets & Decorations',
      description: 'Beautiful Christmas decorations and festive markets throughout the city',
      start: new Date('2025-11-20'),
      end: new Date('2025-12-31'),
      isRecurring: true,
      priority: 8,
    },
  ],
  'tokyo': [
    {
      city: 'tokyo',
      country: 'Japan',
      event: 'Cherry Blossom Season',
      description: 'Sakura (cherry blossoms) peak bloom period',
      start: new Date('2025-03-22'),
      end: new Date('2025-04-05'),
      isRecurring: true,
      priority: 10,
      bookingAdvice: 'Book hotels 3-6 months in advance for best availability',
    },
    {
      city: 'tokyo',
      country: 'Japan',
      event: 'Autumn Foliage',
      description: 'Koyo (autumn leaves) peak viewing period',
      start: new Date('2025-11-15'),
      end: new Date('2025-11-30'),
      isRecurring: true,
      priority: 8,
    },
    {
      city: 'tokyo',
      country: 'Japan',
      event: 'Golden Week',
      description: 'Major national holiday period, very crowded',
      start: new Date('2025-04-29'),
      end: new Date('2025-05-06'),
      isRecurring: true,
      priority: 7,
    },
    {
      city: 'tokyo',
      country: 'Japan',
      event: 'Christmas Illuminations',
      description: 'Beautiful Christmas decorations and illuminations throughout the city',
      start: new Date('2025-11-15'),
      end: new Date('2025-12-31'),
      isRecurring: true,
      priority: 7,
    },
  ],
  'osaka': [
    {
      city: 'osaka',
      country: 'Japan',
      event: 'Cherry Blossom Season',
      description: 'Cherry blossoms in parks and along rivers',
      start: new Date('2025-03-28'),
      end: new Date('2025-04-08'),
      isRecurring: true,
      priority: 8,
    },
  ],
};

/**
 * Normalize city name to slug format
 */
function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Check if a date falls within an event period
 */
function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  
  return checkDate >= startDate && checkDate <= endDate;
}

/**
 * Get seasonal context for a city
 */
export function getSeasonalContext(
  city: string,
  date: Date = new Date()
): { text: string; start: Date; end: Date; event: string } | null {
  const citySlug = normalizeCity(city);
  const events = SEASONALITY_DATA[citySlug];
  
  if (!events || events.length === 0) {
    return null;
  }
  
  // Find active events (current date within range)
  const activeEvents = events.filter(event => 
    isDateInRange(date, event.start, event.end)
  );
  
  if (activeEvents.length === 0) {
    // Find upcoming events
    const upcomingEvents = events
      .filter(event => event.start > date)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    
    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      const daysUntil = Math.ceil((nextEvent.start.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return {
        text: `${nextEvent.event} starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} (${nextEvent.description}).`,
        start: nextEvent.start,
        end: nextEvent.end,
        event: nextEvent.event,
      };
    }
    
    // No upcoming events, return highest priority event info
    const topEvent = events.sort((a, b) => b.priority - a.priority)[0];
    const monthName = topEvent.start.toLocaleString('en-US', { month: 'long' });
    return {
      text: `${topEvent.event} typically occurs in ${monthName} (${topEvent.description}).`,
      start: topEvent.start,
      end: topEvent.end,
      event: topEvent.event,
    };
  }
  
  // Return active event with highest priority
  const activeEvent = activeEvents.sort((a, b) => b.priority - a.priority)[0];
  
  const startMonth = activeEvent.start.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  const endMonth = activeEvent.end.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  
  let text = `${activeEvent.event}: ${startMonth}–${endMonth}. ${activeEvent.description}`;
  if (activeEvent.bookingAdvice) {
    text += ` ${activeEvent.bookingAdvice}`;
  }
  
  return {
    text,
    start: activeEvent.start,
    end: activeEvent.end,
    event: activeEvent.event,
  };
}

/**
 * Get all seasonal events for a city
 */
export function getAllSeasonalEvents(city: string): SeasonalityInfo[] {
  const citySlug = normalizeCity(city);
  return SEASONALITY_DATA[citySlug] || [];
}

/**
 * Check if a query asks about timing/seasonality
 */
export function isTimingQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const timingKeywords = [
    'when', 'best time', 'season', 'peak', 'bloom', 'blossom',
    'when to visit', 'when is', 'what time', 'peak season'
  ];
  
  return timingKeywords.some(keyword => lowerQuery.includes(keyword));
}


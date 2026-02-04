# Real-Time Intelligence Implementation Plan
**Priority:** HIGH
**Timeline:** 6-8 weeks
**Impact:** Transforms discovery into actionable recommendations

---

## 🎯 Goal

Add real-time contextual intelligence that helps users make immediate decisions about where to go, when to visit, and what to expect.

---

## 📊 Real-Time Features to Implement

### Phase 1: Foundation (Week 1-2)
**Goal:** Set up infrastructure and basic real-time data collection

#### 1.1 Database Schema
```sql
-- Real-time destination status
CREATE TABLE destination_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  status_type TEXT NOT NULL, -- 'crowding', 'wait_time', 'availability', 'special_hours'
  status_value JSONB NOT NULL,
  confidence_score FLOAT, -- 0.0-1.0 confidence in the data
  data_source TEXT, -- 'google_places', 'manual', 'user_reported', 'predicted'
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- When this data becomes stale
  metadata JSONB
);

CREATE INDEX idx_destination_status_lookup
  ON destination_status(destination_id, status_type, recorded_at DESC);

CREATE INDEX idx_destination_status_expiry
  ON destination_status(expires_at) WHERE expires_at IS NOT NULL;

-- Real-time crowding levels
CREATE TABLE crowding_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  day_of_week INT, -- 0=Sunday, 6=Saturday
  hour_of_day INT, -- 0-23
  crowding_level TEXT, -- 'quiet', 'moderate', 'busy', 'very_busy'
  crowding_score INT, -- 0-100
  sample_size INT, -- How many data points this is based on
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crowding_lookup
  ON crowding_data(destination_id, day_of_week, hour_of_day);

-- Price alerts and tracking
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  alert_type TEXT, -- 'price_drop', 'availability', 'new_hours', 'event_nearby'
  threshold_value JSONB, -- Alert conditions
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_alerts_active
  ON price_alerts(user_id, is_active) WHERE is_active = true;

-- User-reported real-time updates
CREATE TABLE user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  report_type TEXT, -- 'wait_time', 'crowding', 'closed', 'special_offer'
  report_data JSONB,
  verified BOOLEAN DEFAULT false,
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Auto-expire after a few hours
);

CREATE INDEX idx_user_reports_recent
  ON user_reports(destination_id, created_at DESC)
  WHERE verified = true AND expires_at > NOW();

-- Enable RLS
ALTER TABLE destination_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowding_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Policies (read-only for most, user-specific for alerts)
CREATE POLICY "Public read access" ON destination_status FOR SELECT USING (true);
CREATE POLICY "Public read access" ON crowding_data FOR SELECT USING (true);
CREATE POLICY "Users manage own alerts" ON price_alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public read verified reports" ON user_reports FOR SELECT USING (verified = true);
CREATE POLICY "Users can create reports" ON user_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### 1.2 Backend Services

**File:** `/services/realtime/realtime-intelligence.ts`
```typescript
/**
 * Real-Time Intelligence Service
 * Aggregates and provides real-time contextual data
 */

import { createServiceRoleClient } from '@/lib/supabase-server';

export interface RealtimeStatus {
  crowding?: {
    level: 'quiet' | 'moderate' | 'busy' | 'very_busy';
    score: number; // 0-100
    lastUpdated: string;
    predictedNext?: { time: string; level: string }[];
  };
  waitTime?: {
    current: number; // minutes
    historical: number; // average for this time
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  availability?: {
    status: 'available' | 'limited' | 'full' | 'closed';
    details?: string;
  };
  specialHours?: {
    isOpen: boolean;
    closingSoon?: boolean; // Within 1 hour
    nextOpen?: string;
    reason?: string; // 'holiday', 'special_event', 'maintenance'
  };
  bestTimeToVisit?: {
    today: string[]; // ['10:00-12:00', '14:00-16:00']
    thisWeek: Array<{ day: string; hours: string[] }>;
  };
  alerts?: Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'urgent';
  }>;
}

export class RealtimeIntelligenceService {
  private supabase = createServiceRoleClient();

  /**
   * Get comprehensive real-time status for a destination
   */
  async getRealtimeStatus(
    destinationId: number,
    userId?: string
  ): Promise<RealtimeStatus> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hourOfDay = now.getHours();

    // Fetch all real-time data in parallel
    const [crowding, userReports, openingHours] = await Promise.all([
      this.getCrowdingLevel(destinationId, dayOfWeek, hourOfDay),
      this.getRecentUserReports(destinationId),
      this.getOpeningStatus(destinationId, now),
    ]);

    // Aggregate and build status
    const status: RealtimeStatus = {};

    if (crowding) {
      status.crowding = crowding;
      status.bestTimeToVisit = await this.predictBestTimes(
        destinationId,
        dayOfWeek
      );
    }

    if (userReports.waitTime) {
      status.waitTime = userReports.waitTime;
    }

    if (openingHours) {
      status.specialHours = openingHours;
      status.availability = this.determineAvailability(openingHours, crowding);
    }

    // Check for alerts (if user is logged in)
    if (userId) {
      status.alerts = await this.getActiveAlerts(destinationId, userId);
    }

    return status;
  }

  /**
   * Get current crowding level
   */
  private async getCrowdingLevel(
    destinationId: number,
    dayOfWeek: number,
    hourOfDay: number
  ): Promise<RealtimeStatus['crowding'] | null> {
    try {
      // Try to get recent real-time data first
      const { data: recentStatus } = await this.supabase
        .from('destination_status')
        .select('*')
        .eq('destination_id', destinationId)
        .eq('status_type', 'crowding')
        .gte('recorded_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 min
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (recentStatus) {
        return {
          level: recentStatus.status_value.level,
          score: recentStatus.status_value.score,
          lastUpdated: recentStatus.recorded_at,
        };
      }

      // Fall back to historical patterns
      const { data: historical } = await this.supabase
        .from('crowding_data')
        .select('*')
        .eq('destination_id', destinationId)
        .eq('day_of_week', dayOfWeek)
        .eq('hour_of_day', hourOfDay)
        .single();

      if (historical) {
        // Predict next few hours
        const nextHours = await this.predictNextHours(
          destinationId,
          dayOfWeek,
          hourOfDay,
          3
        );

        return {
          level: historical.crowding_level as any,
          score: historical.crowding_score,
          lastUpdated: historical.last_updated,
          predictedNext: nextHours,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting crowding level:', error);
      return null;
    }
  }

  /**
   * Predict crowding for next N hours
   */
  private async predictNextHours(
    destinationId: number,
    dayOfWeek: number,
    currentHour: number,
    count: number
  ): Promise<Array<{ time: string; level: string }>> {
    const predictions: Array<{ time: string; level: string }> = [];

    for (let i = 1; i <= count; i++) {
      const hour = (currentHour + i) % 24;
      const { data } = await this.supabase
        .from('crowding_data')
        .select('crowding_level')
        .eq('destination_id', destinationId)
        .eq('day_of_week', dayOfWeek)
        .eq('hour_of_day', hour)
        .single();

      if (data) {
        predictions.push({
          time: `${hour.toString().padStart(2, '0')}:00`,
          level: data.crowding_level,
        });
      }
    }

    return predictions;
  }

  /**
   * Get recent user-reported updates
   */
  private async getRecentUserReports(
    destinationId: number
  ): Promise<{ waitTime?: RealtimeStatus['waitTime'] }> {
    try {
      const { data: reports } = await this.supabase
        .from('user_reports')
        .select('*')
        .eq('destination_id', destinationId)
        .eq('report_type', 'wait_time')
        .eq('verified', true)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('created_at', { ascending: false })
        .limit(5);

      if (!reports || reports.length === 0) return {};

      // Average recent wait times
      const avgWaitTime =
        reports.reduce((sum, r) => sum + r.report_data.minutes, 0) /
        reports.length;

      // Determine trend
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (reports.length >= 3) {
        const recent = reports.slice(0, 2).reduce((s, r) => s + r.report_data.minutes, 0) / 2;
        const older = reports.slice(2).reduce((s, r) => s + r.report_data.minutes, 0) / (reports.length - 2);

        if (recent > older * 1.2) trend = 'increasing';
        else if (recent < older * 0.8) trend = 'decreasing';
      }

      return {
        waitTime: {
          current: Math.round(avgWaitTime),
          historical: Math.round(avgWaitTime), // TODO: Calculate from historical data
          trend,
        },
      };
    } catch (error) {
      console.error('Error getting user reports:', error);
      return {};
    }
  }

  /**
   * Get opening status including special circumstances
   */
  private async getOpeningStatus(
    destinationId: number,
    now: Date
  ): Promise<RealtimeStatus['specialHours'] | null> {
    try {
      // Get destination with opening hours
      const { data: destination } = await this.supabase
        .from('destinations')
        .select('opening_hours_json')
        .eq('id', destinationId)
        .single();

      if (!destination?.opening_hours_json) return null;

      const hours = typeof destination.opening_hours_json === 'string'
        ? JSON.parse(destination.opening_hours_json)
        : destination.opening_hours_json;

      if (!hours?.weekday_text) return null;

      // Check if open now
      const dayOfWeek = now.getDay();
      const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const todayText = hours.weekday_text[googleDayIndex];

      if (!todayText) return null;

      const hoursText = todayText.substring(todayText.indexOf(':') + 1).trim();

      // Parse and check
      const isOpen = this.isOpenNow(hoursText, now);
      const closingSoon = isOpen && this.isClosingSoon(hoursText, now, 60); // Within 1 hour

      return {
        isOpen,
        closingSoon,
      };
    } catch (error) {
      console.error('Error getting opening status:', error);
      return null;
    }
  }

  private isOpenNow(hoursText: string, now: Date): boolean {
    if (!hoursText || hoursText.toLowerCase().includes('closed')) {
      return false;
    }

    if (hoursText.toLowerCase().includes('24 hours')) {
      return true;
    }

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const timeRanges = hoursText.split(',').map(r => r.trim());

    for (const range of timeRanges) {
      const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (times && times.length >= 2) {
        const openTime = this.parseTime(times[0]);
        const closeTime = this.parseTime(times[1]);

        if (currentTime >= openTime && currentTime < closeTime) {
          return true;
        }
      }
    }

    return false;
  }

  private isClosingSoon(hoursText: string, now: Date, minutesThreshold: number): boolean {
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const timeRanges = hoursText.split(',').map(r => r.trim());

    for (const range of timeRanges) {
      const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (times && times.length >= 2) {
        const closeTime = this.parseTime(times[1]);

        if (currentTime >= closeTime - minutesThreshold && currentTime < closeTime) {
          return true;
        }
      }
    }

    return false;
  }

  private parseTime(timeStr: string): number {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  /**
   * Determine availability based on crowding and hours
   */
  private determineAvailability(
    hours: RealtimeStatus['specialHours'],
    crowding: RealtimeStatus['crowding'] | null
  ): RealtimeStatus['availability'] {
    if (!hours?.isOpen) {
      return { status: 'closed' };
    }

    if (hours.closingSoon) {
      return { status: 'limited', details: 'Closing soon' };
    }

    if (!crowding) {
      return { status: 'available' };
    }

    switch (crowding.level) {
      case 'very_busy':
        return { status: 'limited', details: 'Very busy right now' };
      case 'busy':
        return { status: 'limited', details: 'Busy' };
      default:
        return { status: 'available' };
    }
  }

  /**
   * Predict best times to visit
   */
  private async predictBestTimes(
    destinationId: number,
    currentDayOfWeek: number
  ): Promise<RealtimeStatus['bestTimeToVisit']> {
    try {
      // Get crowding data for today
      const { data: todayData } = await this.supabase
        .from('crowding_data')
        .select('hour_of_day, crowding_level, crowding_score')
        .eq('destination_id', destinationId)
        .eq('day_of_week', currentDayOfWeek)
        .order('hour_of_day', { ascending: true });

      if (!todayData) {
        return { today: [], thisWeek: [] };
      }

      // Find quietest times today (remaining hours)
      const currentHour = new Date().getHours();
      const remainingHours = todayData.filter(d => d.hour_of_day >= currentHour);

      const quietTimes = remainingHours
        .filter(d => d.crowding_level === 'quiet' || d.crowding_level === 'moderate')
        .sort((a, b) => a.crowding_score - b.crowding_score)
        .slice(0, 3)
        .map(d => {
          const startHour = d.hour_of_day.toString().padStart(2, '0');
          const endHour = (d.hour_of_day + 2).toString().padStart(2, '0');
          return `${startHour}:00-${endHour}:00`;
        });

      // Get best times for rest of week
      const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const thisWeek: Array<{ day: string; hours: string[] }> = [];

      for (let i = 1; i <= 6; i++) {
        const dayIndex = (currentDayOfWeek + i) % 7;
        const { data: dayData } = await this.supabase
          .from('crowding_data')
          .select('hour_of_day, crowding_level, crowding_score')
          .eq('destination_id', destinationId)
          .eq('day_of_week', dayIndex)
          .order('crowding_score', { ascending: true })
          .limit(2);

        if (dayData) {
          thisWeek.push({
            day: weekDays[dayIndex],
            hours: dayData.map(d => {
              const hour = d.hour_of_day.toString().padStart(2, '0');
              return `${hour}:00`;
            }),
          });
        }
      }

      return {
        today: quietTimes,
        thisWeek,
      };
    } catch (error) {
      console.error('Error predicting best times:', error);
      return { today: [], thisWeek: [] };
    }
  }

  /**
   * Get active alerts for user
   */
  private async getActiveAlerts(
    destinationId: number,
    userId: string
  ): Promise<Array<{ type: string; message: string; severity: 'info' | 'warning' | 'urgent' }>> {
    try {
      const { data: alerts } = await this.supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('destination_id', destinationId)
        .eq('is_active', true);

      if (!alerts || alerts.length === 0) return [];

      // Check each alert condition
      const activeAlerts: Array<{ type: string; message: string; severity: 'info' | 'warning' | 'urgent' }> = [];

      for (const alert of alerts) {
        // TODO: Implement alert checking logic based on alert_type and threshold_value
        // For now, return placeholder
      }

      return activeAlerts;
    } catch (error) {
      console.error('Error getting active alerts:', error);
      return [];
    }
  }

  /**
   * Update real-time status from external source
   */
  async updateRealtimeStatus(
    destinationId: number,
    statusType: string,
    statusValue: any,
    source: string,
    expiresIn?: number // minutes
  ): Promise<void> {
    try {
      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 60 * 1000)
        : new Date(Date.now() + 30 * 60 * 1000); // Default 30 min

      await this.supabase.from('destination_status').insert({
        destination_id: destinationId,
        status_type: statusType,
        status_value: statusValue,
        data_source: source,
        expires_at: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error('Error updating realtime status:', error);
    }
  }

  /**
   * Clean up expired status data
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      await this.supabase
        .from('destination_status')
        .delete()
        .lt('expires_at', new Date().toISOString());

      console.log('Cleaned up expired realtime data');
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
    }
  }
}

export const realtimeIntelligenceService = new RealtimeIntelligenceService();
```

---

### Phase 2: Data Collection (Week 2-3)
**Goal:** Populate real-time data from multiple sources

#### 2.1 Google Places Popular Times Integration

**File:** `/services/realtime/google-popular-times.ts`
```typescript
/**
 * Google Places Popular Times Integration
 * Fetches and stores crowding data from Google Places API
 */

import { createServiceRoleClient } from '@/lib/supabase-server';

export class GooglePopularTimesService {
  private apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  private supabase = createServiceRoleClient();

  /**
   * Fetch and store popular times for a destination
   */
  async fetchPopularTimes(destinationId: number, placeId: string): Promise<void> {
    try {
      // Note: Google doesn't have a direct Popular Times API
      // This is typically scraped or estimated
      // For production, use a service like:
      // - Besttime.app API
      // - PopularTimes npm package (web scraping)
      // - Google Maps Platform - Place Details with "opening_hours"

      // For now, we'll use Place Details API which has some info
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours,current_opening_hours&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.result?.current_opening_hours?.weekday_text) {
        // Process and store opening hours patterns
        // This is a simplified version - real implementation would need more data
        await this.estimateCrowdingPatterns(destinationId, data.result);
      }
    } catch (error) {
      console.error('Error fetching popular times:', error);
    }
  }

  /**
   * Estimate crowding patterns from available data
   * In production, use actual Popular Times API or service
   */
  private async estimateCrowdingPatterns(
    destinationId: number,
    placeDetails: any
  ): Promise<void> {
    // Typical restaurant/cafe patterns
    const patterns = {
      restaurant: {
        breakfast: { hours: [7, 8, 9], level: 'moderate' },
        lunch: { hours: [12, 13], level: 'busy' },
        dinner: { hours: [18, 19, 20], level: 'very_busy' },
        quiet: { hours: [10, 11, 14, 15, 16, 17, 21, 22], level: 'quiet' },
      },
      cafe: {
        morning: { hours: [7, 8, 9, 10], level: 'busy' },
        afternoon: { hours: [14, 15, 16], level: 'moderate' },
        quiet: { hours: [11, 12, 13, 17, 18, 19], level: 'quiet' },
      },
    };

    // Get destination category
    const { data: dest } = await this.supabase
      .from('destinations')
      .select('category')
      .eq('id', destinationId)
      .single();

    if (!dest) return;

    const category = dest.category.toLowerCase();
    const pattern = category.includes('cafe') ? patterns.cafe : patterns.restaurant;

    // Insert crowding data for each day of week
    for (let day = 0; day <= 6; day++) {
      for (const [timeOfDay, data] of Object.entries(pattern)) {
        for (const hour of data.hours) {
          const score = {
            quiet: 25,
            moderate: 50,
            busy: 75,
            very_busy: 95,
          }[data.level];

          await this.supabase.from('crowding_data').upsert({
            destination_id: destinationId,
            day_of_week: day,
            hour_of_day: hour,
            crowding_level: data.level,
            crowding_score: score,
            sample_size: 1, // Estimated
          });
        }
      }
    }
  }

  /**
   * Batch update crowding data for all destinations
   * Run this as a cron job daily
   */
  async updateAllDestinations(): Promise<void> {
    const { data: destinations } = await this.supabase
      .from('destinations')
      .select('id, place_id')
      .not('place_id', 'is', null)
      .limit(100); // Process in batches

    if (!destinations) return;

    for (const dest of destinations) {
      await this.fetchPopularTimes(dest.id, dest.place_id!);
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export const googlePopularTimesService = new GooglePopularTimesService();
```

#### 2.2 Cron Job Setup

**File:** `/app/api/cron/update-realtime-data/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { realtimeIntelligenceService } from '@/services/realtime/realtime-intelligence';
import { googlePopularTimesService } from '@/services/realtime/google-popular-times';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clean up expired data
    await realtimeIntelligenceService.cleanupExpiredData();

    // Update crowding data from Google (daily)
    await googlePopularTimesService.updateAllDestinations();

    return NextResponse.json({
      success: true,
      message: 'Realtime data updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating realtime data:', error);
    return NextResponse.json({
      error: 'Failed to update realtime data',
      details: error.message
    }, { status: 500 });
  }
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/update-realtime-data",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

### Phase 3: API Endpoints (Week 3-4)
**Goal:** Expose real-time data to frontend

#### 3.1 Real-Time Status API

**File:** `/app/api/realtime/status/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { realtimeIntelligenceService } from '@/services/realtime/realtime-intelligence';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const destinationId = parseInt(searchParams.get('destination_id') || '0');

    if (!destinationId) {
      return NextResponse.json(
        { error: 'destination_id is required' },
        { status: 400 }
      );
    }

    // Get user if authenticated
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch real-time status
    const status = await realtimeIntelligenceService.getRealtimeStatus(
      destinationId,
      user?.id
    );

    return NextResponse.json({
      destinationId,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching realtime status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch realtime status', details: error.message },
      { status: 500 }
    );
  }
}
```

#### 3.2 User Report API

**File:** `/app/api/realtime/report/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { destinationId, reportType, reportData } = body;

    if (!destinationId || !reportType || !reportData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert user report
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // Expires in 4 hours

    const { data, error } = await supabase
      .from('user_reports')
      .insert({
        user_id: user.id,
        destination_id: destinationId,
        report_type: reportType,
        report_data: reportData,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      report: data,
    });
  } catch (error: any) {
    console.error('Error creating user report:', error);
    return NextResponse.json(
      { error: 'Failed to create report', details: error.message },
      { status: 500 }
    );
  }
}
```

---

### Phase 4: UI Components (Week 4-5)
**Goal:** Display real-time intelligence in the UI

#### 4.1 Real-Time Status Widget

**File:** `/components/RealtimeStatus.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Clock, Users, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RealtimeStatus } from '@/services/realtime/realtime-intelligence';

interface Props {
  destinationId: number;
  compact?: boolean;
}

export function RealtimeStatusWidget({ destinationId, compact = false }: Props) {
  const [status, setStatus] = useState<RealtimeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [destinationId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/realtime/status?destination_id=${destinationId}`);
      const data = await response.json();
      setStatus(data.status);
    } catch (error) {
      console.error('Error fetching realtime status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
      </div>
    );
  }

  if (!status || (!status.crowding && !status.waitTime && !status.specialHours)) {
    return null;
  }

  const getCrowdingColor = (level?: string) => {
    switch (level) {
      case 'quiet': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'busy': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'very_busy': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getCrowdingLabel = (level?: string) => {
    switch (level) {
      case 'quiet': return 'Quiet';
      case 'moderate': return 'Moderate';
      case 'busy': return 'Busy';
      case 'very_busy': return 'Very Busy';
      default: return 'Unknown';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-3 w-3" />;
      case 'decreasing': return <TrendingDown className="h-3 w-3" />;
      default: return <Minus className="h-3 w-3" />;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        {status.crowding && (
          <div className={`px-2 py-1 rounded-full flex items-center gap-1 ${getCrowdingColor(status.crowding.level)}`}>
            <Users className="h-3 w-3" />
            <span>{getCrowdingLabel(status.crowding.level)}</span>
          </div>
        )}
        {status.specialHours?.closingSoon && (
          <div className="px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Closing soon</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Right Now
      </h3>

      {/* Crowding Level */}
      {status.crowding && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">Crowding</span>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getCrowdingColor(status.crowding.level)}`}>
              {getCrowdingLabel(status.crowding.level)}
            </div>
          </div>

          {/* Crowding bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                status.crowding.level === 'quiet' ? 'bg-green-500' :
                status.crowding.level === 'moderate' ? 'bg-yellow-500' :
                status.crowding.level === 'busy' ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${status.crowding.score}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Wait Time */}
      {status.waitTime && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">Wait Time</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{status.waitTime.current} min</span>
            {getTrendIcon(status.waitTime.trend)}
          </div>
        </div>
      )}

      {/* Opening Status */}
      {status.specialHours && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">Status</span>
          <div className={`px-2 py-1 rounded-full font-medium ${
            status.specialHours.isOpen ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
          }`}>
            {status.specialHours.isOpen ? 'Open' : 'Closed'}
            {status.specialHours.closingSoon && ' (Closing Soon)'}
          </div>
        </div>
      )}

      {/* Best Time to Visit */}
      {status.bestTimeToVisit && status.bestTimeToVisit.today.length > 0 && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Best times today:
          </div>
          <div className="flex flex-wrap gap-1">
            {status.bestTimeToVisit.today.map((time, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs"
              >
                {time}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {status.alerts && status.alerts.length > 0 && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
          {status.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 text-xs p-2 rounded ${
                alert.severity === 'urgent' ? 'bg-red-50 dark:bg-red-900/20 text-red-600' :
                alert.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600' :
                'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
              }`}
            >
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-800">
        Updated {status.crowding?.lastUpdated ? new Date(status.crowding.lastUpdated).toLocaleTimeString() : 'recently'}
      </div>
    </div>
  );
}
```

#### 4.2 Report Wait Time Button

**File:** `/components/ReportWaitTime.tsx`
```typescript
'use client';

import { useState } from 'react';
import { Clock, Check } from 'lucide-react';

interface Props {
  destinationId: number;
  onReported?: () => void;
}

export function ReportWaitTimeButton({ destinationId, onReported }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [waitTime, setWaitTime] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/realtime/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationId,
          reportType: 'wait_time',
          reportData: { minutes: waitTime },
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setShowModal(false);
          setSubmitted(false);
          onReported?.();
        }, 1500);
      }
    } catch (error) {
      console.error('Error reporting wait time:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex items-center gap-1.5"
      >
        <Clock className="h-3 w-3" />
        Report wait time
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">Report Current Wait Time</h3>

            {!submitted ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                      Approximate wait time
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="120"
                        step="5"
                        value={waitTime}
                        onChange={(e) => setWaitTime(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xl font-medium w-20 text-right">
                        {waitTime} min
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-3">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Thanks for helping others!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
```

---

### Phase 5: Integration (Week 5-6)
**Goal:** Add real-time intelligence to destination pages and search results

#### 5.1 Update Destination Drawer

Add to `/components/DestinationDrawer.tsx`:
```typescript
import { RealtimeStatusWidget } from './RealtimeStatus';
import { ReportWaitTimeButton } from './ReportWaitTime';

// Inside the drawer, after the header section:
{destination.id && (
  <div className="px-6">
    <RealtimeStatusWidget destinationId={destination.id} />
    <div className="mt-3">
      <ReportWaitTimeButton
        destinationId={destination.id}
        onReported={() => {
          // Refresh realtime data
        }}
      />
    </div>
  </div>
)}
```

#### 5.2 Add to Search Results

Add compact view to destination cards in search results:
```typescript
import { RealtimeStatusWidget } from './RealtimeStatus';

// Inside destination card component:
{destination.id && (
  <div className="mt-2">
    <RealtimeStatusWidget destinationId={destination.id} compact />
  </div>
)}
```

---

## 📈 Phase 6: Advanced Features (Week 6-8)

### 6.1 Price Drop Alerts
- Monitor destination pricing (if available)
- Email/push notifications when prices drop
- Alert management UI

### 6.2 Predictive Intelligence
- Machine learning model for better crowding predictions
- Seasonal pattern analysis
- Event-based demand forecasting

### 6.3 Comparative Intelligence
- "Usually X% busier than now"
- "Best time historically is..."
- Comparison with similar destinations

---

## 🎯 Success Metrics

### Technical Metrics
- **Data Freshness:** < 30 min average age
- **API Response Time:** < 200ms p95
- **Cache Hit Rate:** > 80%
- **User Report Accuracy:** > 70% agreement

### User Engagement
- **Status Views:** Track views of realtime status
- **Report Submissions:** Target 5% of users reporting
- **Decision Impact:** Survey users - "Did this help you decide?"
- **Bounce Rate Reduction:** 15% fewer bounces on destination pages

---

## 🛠️ Technical Requirements

### Infrastructure
1. **Caching Layer (Redis)**
   - Cache realtime status for 5-10 minutes
   - Reduce database load
   - ```bash
     # Add to Vercel/Railway
     npm install @upstash/redis
     ```

2. **Background Jobs**
   - Vercel Cron for data updates
   - Or use BullMQ with Redis

3. **External APIs**
   - Google Places API (required)
   - Besttime.app or similar for real Popular Times data
   - OpenWeather API (already integrated)

### Environment Variables
```env
GOOGLE_MAPS_API_KEY=your_key
CRON_SECRET=random_secure_string
UPSTASH_REDIS_URL=your_redis_url
UPSTASH_REDIS_TOKEN=your_redis_token
```

---

## 💰 Cost Estimates

### APIs
- **Google Places API:** ~$17 per 1000 requests
  - Estimate: 10K destinations × 1 update/day = $170/month
- **Besttime.app:** $99-299/month for Popular Times data
- **Redis (Upstash):** Free tier sufficient to start, $10-30/month for scale

**Total Estimated:** $280-500/month for full real-time intelligence

---

## 🚀 Quick Start Implementation

### Week 1 Tasks
1. ✅ Run database migrations (destination_status, crowding_data, etc.)
2. ✅ Create realtime intelligence service
3. ✅ Set up basic API endpoints
4. ✅ Create RealtimeStatusWidget component

### Week 2 Tasks
1. ✅ Integrate Google Popular Times (or alternative)
2. ✅ Set up cron job for data updates
3. ✅ Add to destination drawer
4. ✅ Test with sample destinations

### Week 3-4 Tasks
1. ✅ Add user reporting functionality
2. ✅ Implement best time predictions
3. ✅ Add alerts system
4. ✅ Polish UI/UX

---

## 📝 Next Steps

1. **Review this plan** - Adjust timeline and scope as needed
2. **Set up infrastructure** - Redis, cron jobs, API keys
3. **Run database migrations** - Create tables
4. **Start with Phase 1** - Foundation and service layer
5. **Beta test with select destinations** - Start with 10-20 places
6. **Gather feedback** - Iterate based on user needs

---

*Ready to start implementation? I can help you with any specific phase!*

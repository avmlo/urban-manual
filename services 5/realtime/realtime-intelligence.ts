/**
 * Real-Time Intelligence Service
 * Aggregates and provides real-time contextual data
 */

import { createServerClient } from '@/lib/supabase-server';

const getSupabase = async () => await createServerClient();

export interface RealtimeStatus {
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
    closingSoon?: boolean;
    nextOpen?: string;
    reason?: string;
  };
  alerts?: Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'urgent';
  }>;
}

export class RealtimeIntelligenceService {
  /**
   * Get comprehensive real-time status for a destination
   */
  async getRealtimeStatus(
    destinationId: number,
    userId?: string
  ): Promise<RealtimeStatus> {
    const now = new Date();

    // Fetch data in parallel
    const [openingHours, userReports] = await Promise.all([
      this.getOpeningStatus(destinationId, now),
      this.getRecentUserReports(destinationId),
    ]);

    // Aggregate status
    const status: RealtimeStatus = {};

    // Add wait time from user reports
    if (userReports.waitTime) {
      status.waitTime = userReports.waitTime;
    }

    if (openingHours) {
      status.specialHours = openingHours;
      status.availability = this.determineAvailability(openingHours);
    }

    return status;
  }

  /**
   * Get recent user reports and aggregate wait time data
   */
  private async getRecentUserReports(destinationId: number): Promise<{
    waitTime?: RealtimeStatus['waitTime'];
  }> {
    try {
      const supabase = await getSupabase();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: reports } = await supabase
        .from('user_reports')
        .select('report_type, report_data, created_at')
        .eq('destination_id', destinationId)
        .eq('verified', true)
        .in('report_type', ['wait_time'])
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!reports || reports.length === 0) {
        return {};
      }

      // Calculate average wait time from recent reports
      const waitTimeReports = reports.filter((r: any) => r.report_type === 'wait_time' && r.report_data?.wait_time);
      
      if (waitTimeReports.length > 0) {
        const waitTimes = waitTimeReports.map((r: any) => r.report_data.wait_time);
        const avgWaitTime = Math.round(
          waitTimes.reduce((sum: number, wt: number) => sum + wt, 0) / waitTimes.length
        );
        
        // Determine trend (simple: compare with older reports if available)
        const trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        
        return {
          waitTime: {
            current: avgWaitTime,
            historical: avgWaitTime, // Could be enhanced with historical data
            trend,
          },
        };
      }

      return {};
    } catch (error) {
      console.error('Error getting user reports:', error);
      return {};
    }
  }

  /**
   * Get opening status
   */
  private async getOpeningStatus(
    destinationId: number,
    now: Date
  ): Promise<RealtimeStatus['specialHours'] | null> {
    try {
      const supabase = await getSupabase();
      const { data: destination } = await supabase
        .from('destinations')
        .select('opening_hours_json')
        .eq('id', destinationId)
        .single();

      if (!destination?.opening_hours_json) return null;

      const hours = typeof destination.opening_hours_json === 'string'
        ? JSON.parse(destination.opening_hours_json)
        : destination.opening_hours_json;

      if (!hours?.weekday_text) return null;

      const dayOfWeek = now.getDay();
      const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const todayText = hours.weekday_text[googleDayIndex];

      if (!todayText) return null;

      const hoursText = todayText.substring(todayText.indexOf(':') + 1).trim();
      const isOpen = this.isOpenNow(hoursText, now);
      const closingSoon = isOpen && this.isClosingSoon(hoursText, now, 60);

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
    if (!hoursText || hoursText.toLowerCase().includes('closed')) return false;
    if (hoursText.toLowerCase().includes('24 hours')) return true;

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
   * Determine availability
   */
  private determineAvailability(
    hours: RealtimeStatus['specialHours']
  ): RealtimeStatus['availability'] {
    if (!hours?.isOpen) {
      return { status: 'closed' };
    }

    if (hours.closingSoon) {
      return { status: 'limited', details: 'Closing soon' };
    }

    return { status: 'available' };
  }
}

export const realtimeIntelligenceService = new RealtimeIntelligenceService();

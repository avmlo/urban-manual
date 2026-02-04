/**
 * Multi-Day Trip Planning Service
 * Enhanced multi-day planning with route optimization and budget awareness
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { itineraryIntelligenceService, Itinerary } from '@/services/intelligence/itinerary';
import { realtimeIntelligenceService } from '@/services/realtime/realtime-intelligence';

export interface MultiDayTripPlan {
  tripId?: string;
  city: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  days: Array<{
    dayNumber: number;
    date: Date;
    items: Array<{
      destinationId: number;
      destinationSlug?: string;
      destinationName?: string;
      order: number;
      timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      startTime?: string;
      endTime?: string;
      durationMinutes: number;
      travelTimeMinutes?: number;
      estimatedCost?: number;
      notes?: string;
    }>;
    totalTravelTime: number;
    estimatedCost: number;
  }>;
  optimization: {
    totalTravelTime: number;
    totalEstimatedCost: number;
    routeEfficiency: number; // 0-1 score
    categoryBalance: number; // 0-1 score
  };
  constraints?: {
    budget?: number;
    maxTravelTimePerDay?: number;
    preferredCategories?: string[];
  };
}

export class MultiDayTripPlanningService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }
  }

  /**
   * Generate optimized multi-day trip plan
   */
  async generateMultiDayPlan(
    city: string,
    startDate: Date,
    endDate: Date,
    preferences?: {
      categories?: string[];
      budget?: number;
      style?: string;
      mustVisit?: string[];
    },
    userId?: string
  ): Promise<MultiDayTripPlan | null> {
    if (!this.supabase) return null;

    try {
      const durationDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Generate base itinerary
      const itinerary = await itineraryIntelligenceService.generateItinerary(
        city,
        durationDays,
        preferences,
        userId
      );

      if (!itinerary) return null;

      // Optimize route
      const optimizedItinerary = await this.optimizeRoute(itinerary, city);

      // Build day-by-day plan
      const days = this.buildDayPlan(optimizedItinerary, startDate);

      // Calculate optimization metrics
      const optimization = this.calculateOptimizationMetrics(days);

      return {
        city,
        startDate,
        endDate,
        durationDays,
        days,
        optimization,
        constraints: preferences ? {
          budget: preferences.budget,
          preferredCategories: preferences.categories,
        } : undefined,
      };
    } catch (error) {
      console.error('Error generating multi-day plan:', error);
      return null;
    }
  }

  /**
   * Optimize route using graph sequencing and geographic data
   */
  private async optimizeRoute(
    itinerary: Itinerary,
    city: string
  ): Promise<Itinerary> {
    try {
      const destinationIds = itinerary.items
        .map(item => {
          const id = typeof item.destination_id === 'string'
            ? parseInt(item.destination_id)
            : item.destination_id;
          return id;
        })
        .filter(id => !isNaN(id));

      if (destinationIds.length < 2) {
        return itinerary;
      }

      // Use ML service for route optimization
      const mlServiceUrl = process.env.ML_SERVICE_URL;
      if (mlServiceUrl) {
        try {
          const response = await fetch(`${mlServiceUrl}/api/graph/optimize-itinerary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination_ids: destinationIds,
            }),
          });

          if (response.ok) {
            const optimized = await response.json();
            
            // Reorder itinerary items based on optimized sequence
            const optimizedSequence = optimized.optimized_sequence || [];
            const sequenceMap = new Map(
              optimizedSequence.map((item: any, idx: number) => [item.destination_id, idx])
            );

            const reorderedItems = [...itinerary.items].sort((a, b) => {
              const aId = typeof a.destination_id === 'string' 
                ? parseInt(a.destination_id) 
                : a.destination_id;
              const bId = typeof b.destination_id === 'string'
                ? parseInt(b.destination_id)
                : b.destination_id;
              
              const aOrder = (sequenceMap.get(aId) ?? 999) as number;
              const bOrder = (sequenceMap.get(bId) ?? 999) as number;
              return aOrder - bOrder;
            });

            return {
              ...itinerary,
              items: reorderedItems,
            };
          }
        } catch (error) {
          console.error('Error calling ML service for route optimization:', error);
        }
      }

      return itinerary;
    } catch (error) {
      console.error('Error optimizing route:', error);
      return itinerary;
    }
  }

  /**
   * Build day-by-day plan with timing
   */
  private buildDayPlan(
    itinerary: Itinerary,
    startDate: Date
  ): MultiDayTripPlan['days'] {
    const days: MultiDayTripPlan['days'] = [];

    // Group items by day
    const itemsByDay = new Map<number, typeof itinerary.items>();
    
    for (const item of itinerary.items) {
      const day = item.day || 1;
      if (!itemsByDay.has(day)) {
        itemsByDay.set(day, []);
      }
      itemsByDay.get(day)!.push(item);
    }

    // Build day plans
    for (let dayNum = 1; dayNum <= itinerary.duration_days; dayNum++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + dayNum - 1);

      const dayItems = itemsByDay.get(dayNum) || [];
      
      // Calculate timing
      const itemsWithTiming = this.calculateTiming(dayItems);
      
      // Calculate travel time (simplified)
      const totalTravelTime = this.estimateTravelTime(dayItems);
      
      // Estimate cost
      const estimatedCost = this.estimateDayCost(dayItems);

      days.push({
        dayNumber: dayNum,
        date: dayDate,
        items: itemsWithTiming,
        totalTravelTime,
        estimatedCost,
      });
    }

    return days;
  }

  private calculateTiming(
    items: Itinerary['items']
  ): MultiDayTripPlan['days'][0]['items'] {
    let currentTime = 9 * 60; // Start at 9 AM (in minutes)

    return items.map((item: any, idx) => {
      const duration = (item.duration_minutes || item.duration || 120) as number;
      const startTime = this.minutesToTimeString(currentTime);
      const endTime = this.minutesToTimeString(currentTime + duration);

      // Add travel time between items (30 min default)
      const travelTime = idx > 0 ? 30 : 0;
      currentTime += duration + travelTime;

      return {
        destinationId: typeof item.destination_id === 'string'
          ? parseInt(item.destination_id)
          : item.destination_id,
        order: item.order,
        timeOfDay: item.time_of_day || 'morning',
        startTime,
        endTime,
        durationMinutes: duration,
        travelTimeMinutes: travelTime,
        notes: item.notes,
      };
    });
  }

  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private estimateTravelTime(items: Itinerary['items']): number {
    // Simplified: 30 minutes between each destination
    return Math.max(0, (items.length - 1) * 30);
  }

  private estimateDayCost(items: Itinerary['items']): number {
    // Simplified: estimate based on average price level
    // In production, would fetch actual prices
    return items.length * 50; // Placeholder: $50 per destination
  }

  private calculateOptimizationMetrics(
    days: MultiDayTripPlan['days']
  ): MultiDayTripPlan['optimization'] {
    const totalTravelTime = days.reduce((sum, day) => sum + day.totalTravelTime, 0);
    const totalEstimatedCost = days.reduce((sum, day) => sum + day.estimatedCost, 0);

    // Calculate route efficiency (simplified)
    const routeEfficiency = Math.max(0, 1 - (totalTravelTime / (days.length * 120))); // Normalize

    // Calculate category balance (simplified)
    const categoryBalance = 0.8; // Placeholder

    return {
      totalTravelTime,
      totalEstimatedCost,
      routeEfficiency: Math.min(1, Math.max(0, routeEfficiency)),
      categoryBalance,
    };
  }
}

export const multiDayTripPlanningService = new MultiDayTripPlanningService();


/**
 * Forecasting Service
 * Uses time-series models to predict demand, prices, and availability
 */

import { createServiceRoleClient } from '@/lib/supabase-server';

interface ForecastData {
  date: string;
  value: number;
  confidence_lower?: number;
  confidence_upper?: number;
}

interface ForecastResult {
  metric_type: 'price' | 'demand' | 'availability' | 'popularity';
  forecast: ForecastData[];
  trend: 'increasing' | 'decreasing' | 'stable';
  peak_window?: { start: string; end: string };
  insights: string[];
}

export class ForecastingService {
  private supabase = createServiceRoleClient();

  constructor() {
    // Ensure supabase is available
    if (!this.supabase) {
      console.warn('ForecastingService: Supabase client not available');
    }
  }

  /**
   * Forecast demand for a city or destination
   */
  async forecastDemand(
    city?: string,
    destinationId?: string,
    days: number = 30
  ): Promise<ForecastResult | null> {
    try {
      // Fetch historical data
      const historicalData = await this.getHistoricalData(
        destinationId,
        city,
        'popularity',
        days * 2 // Get more historical data for better predictions
      );

      if (!historicalData || historicalData.length < 7) {
        // Need at least a week of data
        return null;
      }

      // Simple trend analysis (can be replaced with Prophet/ARIMA in production)
      const trend = this.analyzeTrend(historicalData);
      const forecast = this.simpleForecast(historicalData, days);
      const peakWindow = this.findPeakWindow(forecast);

      return {
        metric_type: 'demand',
        forecast,
        trend,
        peak_window: peakWindow,
        insights: this.generateInsights(forecast, trend, peakWindow),
      };
    } catch (error) {
      console.error('Error forecasting demand:', error);
      return null;
    }
  }

  /**
   * Forecast price trends
   */
  async forecastPrice(
    destinationId: string,
    days: number = 30
  ): Promise<ForecastResult | null> {
    try {
      const historicalData = await this.getHistoricalData(
        destinationId,
        undefined,
        'price',
        days * 2
      );

      if (!historicalData || historicalData.length < 7) {
        return null;
      }

      const trend = this.analyzeTrend(historicalData);
      const forecast = this.simpleForecast(historicalData, days);

      return {
        metric_type: 'price',
        forecast,
        trend,
        insights: [
          ...this.generatePriceInsights(forecast, trend),
        ],
      };
    } catch (error) {
      console.error('Error forecasting price:', error);
      return null;
    }
  }

  /**
   * Get historical data from database
   */
  private async getHistoricalData(
    destinationId?: string,
    city?: string,
    metricType: string = 'popularity',
    days: number = 60
  ): Promise<Array<{ date: string; value: number }> | null> {
    if (!this.supabase) {
      return this.createSyntheticData(days);
    }
    
    try {
      let query = this.supabase
        .from('forecasting_data')
        .select('metric_value, recorded_at')
        .eq('metric_type', metricType)
        .gte('recorded_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: true });

      if (destinationId) {
        query = query.eq('destination_id', destinationId);
      }

      const { data, error } = await query;

      if (error || !data) {
        // If no historical data, create synthetic data based on current patterns
        return this.createSyntheticData(days);
      }

      // Aggregate by date (daily averages)
      const dailyData = new Map<string, number[]>();
      data.forEach(row => {
        const date = new Date(row.recorded_at).toISOString().split('T')[0];
        if (!dailyData.has(date)) {
          dailyData.set(date, []);
        }
        dailyData.get(date)!.push(row.metric_value);
      });

      const result: Array<{ date: string; value: number }> = [];
      dailyData.forEach((values, date) => {
        result.push({
          date,
          value: values.reduce((a, b) => a + b, 0) / values.length,
        });
      });

      return result.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return this.createSyntheticData(days);
    }
  }

  /**
   * Create synthetic data for destinations without historical data
   * Uses seasonal patterns and basic trends
   */
  private createSyntheticData(days: number): Array<{ date: string; value: number }> {
    const data: Array<{ date: string; value: number }> = [];
    const baseValue = 50;
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Add some seasonality (higher on weekends)
      const dayOfWeek = date.getDay();
      const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 10 : 0;
      
      // Add some random variation
      const randomVariation = (Math.random() - 0.5) * 20;
      
      // Slight upward trend
      const trend = (days - i) * 0.1;

      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(0, baseValue + weekendBoost + randomVariation + trend),
      });
    }

    return data;
  }

  /**
   * Simple trend analysis
   */
  private analyzeTrend(
    data: Array<{ date: string; value: number }>
  ): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.value, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Simple forecasting (moving average with trend)
   * In production, replace with Prophet or ARIMA
   */
  private simpleForecast(
    historicalData: Array<{ date: string; value: number }>,
    days: number
  ): ForecastData[] {
    const forecast: ForecastData[] = [];
    const windowSize = Math.min(7, historicalData.length);
    const recentValues = historicalData.slice(-windowSize).map(d => d.value);
    const avgValue = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;

    // Calculate trend
    const trend = this.calculateTrend(historicalData);
    
    // Calculate seasonality (day of week pattern)
    const dayOfWeekPattern = this.calculateDayOfWeekPattern(historicalData);

    const lastDate = new Date(historicalData[historicalData.length - 1].date);
    
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      const dayOfWeek = forecastDate.getDay();
      const seasonalFactor = dayOfWeekPattern[dayOfWeek] || 0;
      
      const forecastValue = avgValue + (trend * i) + seasonalFactor;
      
      // Confidence interval (simplified)
      const confidence = Math.max(0.7 - (i * 0.01), 0.5); // Decreases over time
      const margin = avgValue * (1 - confidence) * 0.3;

      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        value: Math.max(0, forecastValue),
        confidence_lower: Math.max(0, forecastValue - margin),
        confidence_upper: forecastValue + margin,
      });
    }

    return forecast;
  }

  private calculateTrend(data: Array<{ date: string; value: number }>): number {
    if (data.length < 2) return 0;
    
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const days = data.length - 1;
    
    return (last - first) / days;
  }

  private calculateDayOfWeekPattern(
    data: Array<{ date: string; value: number }>
  ): Record<number, number> {
    const pattern: Record<number, number[]> = {};
    
    data.forEach(({ date, value }) => {
      const dayOfWeek = new Date(date).getDay();
      if (!pattern[dayOfWeek]) {
        pattern[dayOfWeek] = [];
      }
      pattern[dayOfWeek].push(value);
    });

    const avgValue = data.reduce((a, b) => a + b.value, 0) / data.length;
    const result: Record<number, number> = {};
    
    Object.keys(pattern).forEach(day => {
      const dayNum = parseInt(day);
      const dayAvg = pattern[dayNum].reduce((a, b) => a + b, 0) / pattern[dayNum].length;
      result[dayNum] = dayAvg - avgValue; // Difference from overall average
    });

    return result;
  }

  private findPeakWindow(
    forecast: ForecastData[],
    percentile: number = 0.8
  ): { start: string; end: string } | undefined {
    if (forecast.length === 0) return undefined;

    const values = forecast.map(f => f.value);
    const sorted = [...values].sort((a, b) => a - b);
    const threshold = sorted[Math.floor(sorted.length * percentile)];

    const peakDays = forecast.filter(f => f.value >= threshold);
    if (peakDays.length === 0) return undefined;

    return {
      start: peakDays[0].date,
      end: peakDays[peakDays.length - 1].date,
    };
  }

  private generateInsights(
    forecast: ForecastData[],
    trend: string,
    peakWindow?: { start: string; end: string }
  ): string[] {
    const insights: string[] = [];

    if (trend === 'increasing') {
      insights.push('Demand is trending upward - consider booking early');
    } else if (trend === 'decreasing') {
      insights.push('Demand is declining - good time to find deals');
    }

    if (peakWindow) {
      const startDate = new Date(peakWindow.start);
      const endDate = new Date(peakWindow.end);
      insights.push(
        `Peak demand expected ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      );
    }

    return insights;
  }

  private generatePriceInsights(
    forecast: ForecastData[],
    trend: string
  ): string[] {
    const insights: string[] = [];

    if (trend === 'increasing') {
      insights.push('Prices are expected to increase - book soon for best rates');
    } else if (trend === 'decreasing') {
      insights.push('Prices trending down - wait for better deals');
    }

    const avgPrice = forecast.reduce((a, b) => a + b.value, 0) / forecast.length;
    const minPrice = Math.min(...forecast.map(f => f.value));
    const maxPrice = Math.max(...forecast.map(f => f.value));
    
    if (maxPrice > avgPrice * 1.1) {
      insights.push(`Price varies ${Math.round(((maxPrice - minPrice) / avgPrice) * 100)}% - shop around for best dates`);
    }

    return insights;
  }

  /**
   * Store forecast data for future use
   */
  async storeForecastData(
    destinationId: string,
    metricType: string,
    value: number,
    metadata?: any
  ): Promise<void> {
    if (!this.supabase) return;
    
    try {
      await this.supabase.from('forecasting_data').insert({
        destination_id: destinationId,
        metric_type: metricType,
        metric_value: value,
        recorded_at: new Date().toISOString(),
        metadata: metadata || {},
      });
    } catch (error) {
      console.error('Error storing forecast data:', error);
    }
  }
}

export const forecastingService = new ForecastingService();


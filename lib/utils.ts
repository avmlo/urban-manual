import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shared utility functions for Urban Manual
 * Centralized to avoid duplication across components
 */

/**
 * Capitalize city name (handles hyphenated cities)
 * @example "new-york" → "New York"
 */
export function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Capitalize category name (handles multi-word categories)
 * @example "fine dining" → "Fine Dining"
 */
export function capitalizeCategory(category: string): string {
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format distance for display
 * @example 0.5 → "500m", 5 → "5km"
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Format number with locale-specific thousands separator
 * @example 1234 → "1,234"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Debounce function for performance optimization
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Truncate text with ellipsis
 * @example truncate("Long text here", 10) → "Long text..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Get greeting based on time of day
 * @returns "Good Morning", "Good Afternoon", or "Good Evening"
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Format date for display
 * @example formatDate(new Date()) → "November 5, 2025"
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Parse YYYY-MM-DD date string to Date without timezone issues
 * Creates date using local timezone instead of UTC
 * @example parseDateString("2025-01-15") → Date object for Jan 15, 2025 local time
 */
export function parseDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    // Handle YYYY-MM-DD format to avoid UTC interpretation
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    // Fallback for other formats
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Format trip date string for display (short format)
 * Safely parses YYYY-MM-DD without timezone shift
 * @example formatTripDate("2025-01-15") → "Jan 15"
 */
export function formatTripDate(dateStr: string | null | undefined): string | null {
  const date = parseDateString(dateStr);
  if (!date) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format trip date string with year for display
 * Safely parses YYYY-MM-DD without timezone shift
 * @example formatTripDateWithYear("2025-01-15") → "Jan 15, 2025"
 */
export function formatTripDateWithYear(dateStr: string | null | undefined): string | null {
  const date = parseDateString(dateStr);
  if (!date) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format trip date range for display
 * @example formatTripDateRange("2025-01-15", "2025-01-20") → "Jan 15 – Jan 20"
 */
export function formatTripDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): string | null {
  const startFormatted = formatTripDate(startDate);
  const endFormatted = formatTripDate(endDate);

  if (startFormatted && endFormatted) {
    return `${startFormatted} – ${endFormatted}`;
  }
  return startFormatted || endFormatted || null;
}

/**
 * Calculate number of days between two date strings
 * @example calculateTripDays("2025-01-15", "2025-01-20") → 6
 */
export function calculateTripDays(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): number | null {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);

  if (!start || !end) return null;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

/**
 * Format time for display (24-hour format)
 * @example formatTime(new Date()) → "14:30"
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Trigger haptic feedback (mobile devices)
 * Falls back gracefully on unsupported devices
 */
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
  if (typeof window === 'undefined') return;

  // iOS Haptic Feedback (via Taptic Engine)
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(patterns[type]);
  }
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (e) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Convert a string to a URL-friendly slug
 * Handles whitespace, special characters, and consecutive dashes
 * @example toSlug("New York City") → "new-york-city"
 * @example toSlug("Café & Restaurant!") → "cafe-restaurant"
 */
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Convert a string to Title Case
 * Handles hyphenated words and multi-word strings
 * @example toTitleCase("new york") → "New York"
 * @example toTitleCase("san-francisco") → "San-Francisco"
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

/**
 * Simple string hash function for deterministic randomness
 * Used for stable sorting and scoring to prevent hydration mismatches
 * @param str The input string to hash
 * @returns A positive integer hash
 */
export function stringHash(str: string): number {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

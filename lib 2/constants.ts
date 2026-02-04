/**
 * Application constants
 * Centralized to avoid magic numbers and ensure consistency
 */

// Layout & Spacing
export const LAYOUT = {
  HEADER_HEIGHT: 80,
  DRAWER_WIDTH: 480,
  MAX_CONTENT_WIDTH: 1920,
  GRID_GAP_SM: 16, // 1rem
  GRID_GAP_MD: 24, // 1.5rem
} as const;

// Pagination
export const PAGINATION = {
  ITEMS_PER_PAGE_MOBILE: 14, // 2 columns × 7 rows
  ITEMS_PER_PAGE_DESKTOP: 28, // 7 columns × 4 rows
  ITEMS_PER_PAGE_TRENDING: 12,
  ITEMS_PER_PAGE_RECOMMENDATIONS: 6,
} as const;

// Animation durations (ms)
export const ANIMATION = {
  FAST: 150,
  DEFAULT: 200,
  MEDIUM: 300,
  SLOW: 500,
  DRAWER_TRANSITION: 300,
  TOAST_DURATION: 3000,
  TOOLTIP_DELAY: 500,
} as const;

// Debounce delays (ms)
export const DEBOUNCE = {
  SEARCH: 500,
  AUTOCOMPLETE: 300,
  RESIZE: 150,
  SCROLL: 100,
} as const;

// Touch targets (minimum sizes for accessibility)
export const TOUCH_TARGET = {
  MIN_SIZE: 44, // 44x44px - Apple Human Interface Guidelines
  COMFORTABLE: 48, // 48x48px - Material Design
} as const;

// Z-index layers
export const Z_INDEX = {
  DROPDOWN: 10,
  STICKY: 20,
  FIXED: 30,
  MODAL_BACKDROP: 40,
  MODAL: 50,
  DRAWER: 50,
  TOAST: 100,
} as const;

// API limits
export const API = {
  MAX_SEARCH_RESULTS: 100,
  MAX_RECOMMENDATIONS: 6,
  MAX_TRENDING: 12,
  MAX_NEARBY_RADIUS_KM: 25,
  MIN_NEARBY_RADIUS_KM: 0.5,
  DEFAULT_NEARBY_RADIUS_KM: 5,
} as const;

// Search
export const SEARCH = {
  MIN_QUERY_LENGTH: 2,
  MAX_SUGGESTIONS: 5,
  MAX_CONVERSATION_HISTORY: 10,
} as const;

// Grid breakpoints (matches Tailwind default)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// Grid columns by breakpoint
export const GRID_COLUMNS = {
  MOBILE: 2,
  SM: 3,
  MD: 4,
  LG: 5,
  XL: 6,
  '2XL': 7,
} as const;

// Rating
export const RATING = {
  MIN: 0,
  MAX: 5,
  STEP: 0.5,
  DEFAULT_FILTER_OPTIONS: [4.5, 4.0, 3.5, 3.0],
} as const;

// Price levels (Google Places API standard)
export const PRICE_LEVEL = {
  MIN: 1,
  MAX: 4,
  LABELS: {
    1: '$',
    2: '$$',
    3: '$$$',
    4: '$$$$',
  },
} as const;

// City timezones (fallback mapping)
export const CITY_TIMEZONES: Record<string, string> = {
  'tokyo': 'Asia/Tokyo',
  'new-york': 'America/New_York',
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'los-angeles': 'America/Los_Angeles',
  'singapore': 'Asia/Singapore',
  'hong-kong': 'Asia/Hong_Kong',
  'sydney': 'Australia/Sydney',
  'dubai': 'Asia/Dubai',
  'bangkok': 'Asia/Bangkok',
  'barcelona': 'Europe/Madrid',
  'rome': 'Europe/Rome',
  'amsterdam': 'Europe/Amsterdam',
  'berlin': 'Europe/Berlin',
  'lisbon': 'Europe/Lisbon',
  'copenhagen': 'Europe/Copenhagen',
  'miami': 'America/New_York',
  'san-francisco': 'America/Los_Angeles',
  'chicago': 'America/Chicago',
  'toronto': 'America/Toronto',
} as const;

// Feature flags (for easy enabling/disabling features)
export const FEATURES = {
  AI_SEARCH: true,
  NEAR_ME: true,
  HAPTIC_FEEDBACK: true,
  ANALYTICS: true,
  ADS: true,
  OFFLINE_MODE: false, // Future feature
  PUSH_NOTIFICATIONS: false, // Future feature
} as const;

// External URLs
export const URLS = {
  PRIVACY_POLICY: '/privacy',
  TERMS_OF_SERVICE: '/terms',
  SUPPORT_EMAIL: 'support@urbanmanual.co',
  GITHUB_ISSUES: 'https://github.com/urbanmanual/issues',
} as const;

// Michelin stars
export const MICHELIN = {
  MIN: 0,
  MAX: 3,
  ICON_URL: 'https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg',
  ICON_URL_FALLBACK: '/michelin-star.svg',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  ITINERARY: 'urban-manual-itinerary',
  DARK_MODE: 'darkMode',
  RECENT_SEARCHES: 'recent-searches',
  RECENTLY_VIEWED: 'recently-viewed',
  USER_PREFERENCES: 'user-preferences',
} as const;

// Image sizes (for Next.js Image component)
export const IMAGE_SIZES = {
  CARD_MOBILE: '50vw',
  CARD_TABLET: '33vw',
  CARD_DESKTOP: '25vw',
  DRAWER: '(max-width: 640px) 100vw, 480px',
  HERO: '100vw',
  AVATAR: '40px',
} as const;

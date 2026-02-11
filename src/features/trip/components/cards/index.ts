// Card components for itinerary items
export { default as FlightCard } from './FlightCard';
export { default as RestaurantCard } from './RestaurantCard';
export { default as AttractionCard } from './AttractionCard';
export { default as MinimalActivityCard } from './MinimalActivityCard';
export { default as OvernightCard } from './OvernightCard';
export { default as TransportCard } from './TransportCard';
export { default as FreeTimeGap } from './FreeTimeGap';
export { default as CustomCard } from './CustomCard';
export { default as LogisticalIndicators } from './LogisticalIndicators';

// Re-export types from their source locations
export type { ItineraryItem, Flight, HotelBooking } from '@/types/trip';

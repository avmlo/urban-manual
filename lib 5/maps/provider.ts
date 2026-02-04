export type MapProvider = 'apple' | 'mapbox' | 'google';

const MAP_PROVIDER_ORDER: MapProvider[] = ['apple', 'mapbox', 'google'];

const appleAvailable = process.env.NEXT_PUBLIC_MAPKIT_AVAILABLE === 'true';
const mapboxAvailable = Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
const googleAvailable = Boolean(
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
);

const availabilityMap: Record<MapProvider, boolean> = {
  apple: appleAvailable,
  mapbox: mapboxAvailable,
  google: googleAvailable,
};

export function getAvailableProviders(order: MapProvider[] = MAP_PROVIDER_ORDER): MapProvider[] {
  return order.filter(provider => availabilityMap[provider]);
}

export function isProviderAvailable(provider: MapProvider): boolean {
  return availabilityMap[provider];
}

export function getDefaultProvider(): MapProvider | null {
  return getAvailableProviders()[0] ?? null;
}

export const mapProviderOrder = MAP_PROVIDER_ORDER;

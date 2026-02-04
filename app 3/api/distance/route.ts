import { NextRequest, NextResponse } from 'next/server';

interface DistanceRequest {
  origins: Array<{ lat: number; lng: number; name: string }>;
  destinations: Array<{ lat: number; lng: number; name: string }>;
  mode?: 'walking' | 'driving' | 'transit';
}

interface DistanceResult {
  from: string;
  to: string;
  distance: number; // meters
  duration: number; // seconds
  mode: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DistanceRequest = await request.json();
    const { origins, destinations, mode = 'walking' } = body;

    // Check if Google Maps API key is available
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn('Google Maps API key not configured, using estimates');
      // Fallback to distance-based estimates
      return NextResponse.json({
        results: calculateEstimates(origins, destinations, mode),
        source: 'estimate'
      });
    }

    // Format origins and destinations for Google API
    const originsStr = origins.map(o => `${o.lat},${o.lng}`).join('|');
    const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&mode=${mode}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Distance Matrix API error:', data.status);
      return NextResponse.json({
        results: calculateEstimates(origins, destinations, mode),
        source: 'estimate'
      });
    }

    // Parse results
    const results: DistanceResult[] = [];
    data.rows.forEach((row: any, i: number) => {
      row.elements.forEach((element: any, j: number) => {
        if (element.status === 'OK') {
          results.push({
            from: origins[i].name,
            to: destinations[j].name,
            distance: element.distance.value,
            duration: element.duration.value,
            mode,
          });
        }
      });
    });

    return NextResponse.json({
      results,
      source: 'google'
    });
  } catch (error) {
    console.error('Distance API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate distances' },
      { status: 500 }
    );
  }
}

// Fallback: Calculate estimates based on haversine distance
function calculateEstimates(
  origins: Array<{ lat: number; lng: number; name: string }>,
  destinations: Array<{ lat: number; lng: number; name: string }>,
  mode: string
): DistanceResult[] {
  const results: DistanceResult[] = [];

  origins.forEach((origin) => {
    destinations.forEach((dest) => {
      const distance = haversineDistance(
        origin.lat,
        origin.lng,
        dest.lat,
        dest.lng
      );

      // Estimate duration based on mode
      let speed: number; // km/h
      switch (mode) {
        case 'walking':
          speed = 5; // 5 km/h
          break;
        case 'transit':
          speed = 25; // 25 km/h average
          break;
        case 'driving':
          speed = 40; // 40 km/h in city
          break;
        default:
          speed = 5;
      }

      const duration = (distance / speed) * 3600; // seconds

      results.push({
        from: origin.name,
        to: dest.name,
        distance: distance * 1000, // convert to meters
        duration: Math.round(duration),
        mode,
      });
    });
  });

  return results;
}

// Calculate distance between two points using Haversine formula
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

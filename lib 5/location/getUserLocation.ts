interface UserLocation {
  city: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

// Simple in-memory cache by IP for 1 hour
const locationCache = new Map<string, { location: UserLocation; expires: number }>();

export async function getUserLocation(request: Request): Promise<UserLocation | null> {
  try {
    const fwd = request.headers.get('x-forwarded-for') || '';
    const ip = (fwd.split(',')[0] || request.headers.get('x-real-ip') || '').trim();

    // Skip if no IP (local/dev)
    if (!ip) return null;

    const cached = locationCache.get(ip);
    if (cached && cached.expires > Date.now()) return cached.location;

    // Prefer ipinfo if token available, else fallback to ipapi
    const token = process.env.IPINFO_TOKEN;
    let loc: UserLocation | null = null;

    if (token) {
      const res = await fetch(`https://ipinfo.io/${ip}/json?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        const [latStr, lonStr] = String(data.loc || '').split(',');
        loc = {
          city: data.city || 'Unknown',
          country: data.country || 'Unknown',
          timezone: data.timezone || 'UTC',
          latitude: parseFloat(latStr || '0'),
          longitude: parseFloat(lonStr || '0'),
        };
      }
    }

    if (!loc) {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        loc = {
          city: data.city || 'Unknown',
          country: data.country || 'Unknown',
          timezone: data.timezone || 'UTC',
          latitude: Number(data.latitude) || 0,
          longitude: Number(data.longitude) || 0,
        };
      }
    }

    if (!loc) return null;

    locationCache.set(ip, { location: loc, expires: Date.now() + 3600_000 });
    return loc;
  } catch (e) {
    console.error('getUserLocation error:', e);
    return null;
  }
}

export type { UserLocation };



import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, type AdminContext } from '@/lib/errors/auth';

export const GET = withAdminAuth(async (_req: NextRequest, { serviceClient }: AdminContext) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalDestinations },
    { count: enrichedDestinations },
    { count: michelinSpots },
    { count: crownPicks },
    { count: totalSaves },
    { count: missingImages },
    { count: missingDescriptions },
    { count: notEnriched },
    { count: addedThisWeek },
    { data: recentDestinations },
    { data: cityData },
    { count: activeUsers },
  ] = await Promise.all([
    serviceClient.from('destinations').select('*', { count: 'exact', head: true }),
    serviceClient.from('destinations').select('*', { count: 'exact', head: true }).not('last_enriched_at', 'is', null),
    serviceClient.from('destinations').select('*', { count: 'exact', head: true }).gt('michelin_stars', 0),
    serviceClient.from('destinations').select('*', { count: 'exact', head: true }).eq('crown', true),
    serviceClient.from('saved_places').select('*', { count: 'exact', head: true }),
    serviceClient.from('destinations').select('*', { count: 'exact', head: true }).or('image.is.null,image.eq.'),
    serviceClient.from('destinations').select('*', { count: 'exact', head: true }).or('description.is.null,description.eq.'),
    serviceClient.from('destinations').select('*', { count: 'exact', head: true }).is('last_enriched_at', null),
    serviceClient.from('destinations').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo),
    serviceClient.from('destinations').select('name, city, category, slug').order('created_at', { ascending: false }).limit(6),
    serviceClient.from('destinations').select('city'),
    serviceClient.from('user_preferences').select('*', { count: 'exact', head: true }),
  ]);

  // Compute top cities server-side instead of sending all rows to the client
  const cityCount: Record<string, number> = {};
  cityData?.forEach((d: { city: string }) => {
    if (d.city) cityCount[d.city] = (cityCount[d.city] || 0) + 1;
  });

  const topCities = Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([city, count]) => ({ city, count }));

  return NextResponse.json({
    totalDestinations: totalDestinations || 0,
    enrichedDestinations: enrichedDestinations || 0,
    michelinSpots: michelinSpots || 0,
    crownPicks: crownPicks || 0,
    totalSaves: totalSaves || 0,
    activeUsers: activeUsers || 0,
    missingImages: missingImages || 0,
    missingDescriptions: missingDescriptions || 0,
    notEnriched: notEnriched || 0,
    addedThisWeek: addedThisWeek || 0,
    recentDestinations: recentDestinations || [],
    topCities,
  });
});

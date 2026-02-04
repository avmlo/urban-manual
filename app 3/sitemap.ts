import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Determine base URL based on environment
  // Use VERCEL_URL for preview deployments, otherwise use custom domain
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'https://www.urbanmanual.co';

  const currentDate = new Date().toISOString();

  let destinationData: Destination[] = [];
  let cities: string[] = [];

  try {
    // Fetch all destinations and cities
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('slug, city, category')
      .order('slug');

    if (error) {
      console.warn('Sitemap: Could not fetch destinations from Supabase:', error.message);
    } else {
      destinationData = (destinations || []) as Destination[];
      // Get unique cities
      cities = Array.from(new Set(destinationData.map(d => d.city)));
    }
  } catch (error) {
    console.warn('Sitemap: Could not fetch destinations from Supabase:', error);
    // This is fine during build without env vars - generate basic sitemap
  }

  // Main pages - highest priority
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/cities`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // Feature pages
  const featurePages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/lists`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/feed`,
      lastModified: currentDate,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/trips`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  // City pages - important for discovery
  const cityPages: MetadataRoute.Sitemap = cities.map(city => ({
    url: `${baseUrl}/city/${encodeURIComponent(city)}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // Destination pages - core content with high priority
  const destinationPages: MetadataRoute.Sitemap = destinationData.map(dest => {
    // Higher priority for featured destinations (restaurants, cafes, bars)
    const isPrimaryCategory = ['restaurant', 'cafe', 'bar', 'hotel'].includes(dest.category?.toLowerCase() || '');

    return {
      url: `${baseUrl}/destination/${dest.slug}`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: isPrimaryCategory ? 0.75 : 0.65,
    };
  });

  // Legal/static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  return [
    ...mainPages,
    ...featurePages,
    ...cityPages,
    ...destinationPages,
    ...staticPages,
  ];
}

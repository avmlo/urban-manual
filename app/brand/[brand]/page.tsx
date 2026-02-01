import { Suspense } from 'react';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';
import { Metadata } from 'next';
import { generateBrandMetadata, generateBrandBreadcrumb } from '@/lib/metadata';
import BrandPageClient from './page-client';
import { fetchBrandStats } from '@/lib/data/fetch-destinations';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { Destination } from '@/types/destination';
import { Brand } from '@/types/architecture';

// Static generation with ISR
export const revalidate = 300; // 5 minutes
export const dynamicParams = true; // Allow dynamic brands not in generateStaticParams

/**
 * Pre-generate pages for top brands at build time
 * This ensures instant loading for popular brands
 */
export async function generateStaticParams() {
  try {
    const brandStats = await fetchBrandStats();
    // Pre-render top 20 brands by destination count
    return brandStats
      .slice(0, 20)
      .map((stat: { brand: string }) => ({ brand: stat.brand }));
  } catch {
    // Return empty array if fetch fails - pages will be generated on demand
    return [];
  }
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand } = await params;
  const decodedBrand = decodeURIComponent(brand);

  // Get count for better metadata
  try {
    const brandStats = await fetchBrandStats();
    const brandStat = brandStats.find((s: { brand: string; count: number }) => s.brand.toLowerCase() === decodedBrand.toLowerCase());
    return generateBrandMetadata(decodedBrand, brandStat?.count);
  } catch {
    return generateBrandMetadata(decodedBrand);
  }
}

/**
 * Fetch brand data from the brands table
 */
async function fetchBrandData(brandName: string): Promise<Brand | null> {
  try {
    const supabase = createServiceRoleClient();

    // First try to find by name (case-insensitive)
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .ilike('name', brandName)
      .single();

    if (error || !data) {
      // Try by slug
      const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data: slugData } = await supabase
        .from('brands')
        .select('*')
        .eq('slug', slug)
        .single();

      return slugData as Brand | null;
    }

    return data as Brand;
  } catch (error) {
    console.error(`Error fetching brand data for ${brandName}:`, error);
    return null;
  }
}

/**
 * Fetch destinations for a specific brand
 */
async function fetchBrandDestinations(brand: string): Promise<Destination[]> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('destinations')
      .select(`
        id,
        slug,
        name,
        city,
        country,
        neighborhood,
        category,
        micro_description,
        description,
        content,
        image,
        image_thumbnail,
        michelin_stars,
        crown,
        rating,
        price_level,
        tags,
        opening_hours_json,
        latitude,
        longitude,
        brand
      `)
      .ilike('brand', brand)
      .order('rating', { ascending: false, nullsFirst: false });

    if (error) {
      console.error(`Error fetching destinations for brand ${brand}:`, error.message);
      return [];
    }

    return (data || []) as Destination[];
  } catch (error) {
    console.error(`Exception fetching destinations for brand ${brand}:`, error);
    return [];
  }
}

/**
 * Brand Page - Highest Performance Architecture
 *
 * - Static generation for top 20 brands at build time
 * - ISR for other brands (generated on-demand, cached)
 * - Streaming with Suspense for dynamic content
 */
export default async function BrandPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;
  const decodedBrand = decodeURIComponent(brand);

  // Fetch brand data and destinations on the server (in parallel)
  const [brandData, destinations] = await Promise.all([
    fetchBrandData(decodedBrand),
    fetchBrandDestinations(decodedBrand),
  ]);

  // Extract unique categories from destinations
  const categoryMap = new Map<string, number>();
  destinations.forEach(d => {
    if (d.category) {
      const categoryLower = d.category.toLowerCase();
      categoryMap.set(categoryLower, (categoryMap.get(categoryLower) || 0) + 1);
    }
  });

  // Only include categories with at least 2 destinations
  const categories = Array.from(categoryMap.entries())
    .filter(([_, count]) => count >= 2)
    .map(([category]) => category);

  // Extract unique cities from destinations
  const cityMap = new Map<string, number>();
  destinations.forEach(d => {
    if (d.city) {
      cityMap.set(d.city, (cityMap.get(d.city) || 0) + 1);
    }
  });

  const cities = Array.from(cityMap.entries())
    .filter(([_, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([city]) => city);

  // Generate breadcrumb schema
  const breadcrumb = generateBrandBreadcrumb(decodedBrand);

  return (
    <>
      {/* Breadcrumb Schema */}
      {breadcrumb && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumb),
          }}
        />
      )}

      <Suspense fallback={<SearchGridSkeleton />}>
        <BrandPageClient
          brand={decodedBrand}
          brandData={brandData}
          initialDestinations={destinations}
          initialCategories={categories}
          initialCities={cities}
        />
      </Suspense>
    </>
  );
}

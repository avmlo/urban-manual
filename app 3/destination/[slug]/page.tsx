import { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import DetailSkeleton from '@/src/features/detail/DetailSkeleton';
import {
  generateDestinationMetadata,
  generateDestinationSchema,
  generateDestinationBreadcrumb,
  generateDestinationFAQ
} from '@/lib/metadata';
import { createServerClient } from '@/lib/supabase-server';
import { Destination } from '@/types/destination';
import DestinationPageClient from './page-client';

// Validate and sanitize slug
function validateSlug(slug: string): boolean {
  // Slug should only contain lowercase letters, numbers, and hyphens
  return /^[a-z0-9-]+$/.test(slug);
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Validate slug format
  if (!validateSlug(slug)) {
    return {};
  }

  return generateDestinationMetadata(slug);
}

// Server component wrapper
export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Validate slug format
  if (!validateSlug(slug)) {
    notFound();
  }

  // Fetch destination data on server using server-side client
  const supabase = await createServerClient();
  const { data: destination, error } = await supabase
    .from('destinations')
    .select(`
      *,
      formatted_address,
      international_phone_number,
      website,
      rating,
      user_ratings_total,
      price_level,
      opening_hours_json,
      editorial_summary,
      google_name,
      place_types_json,
      utc_offset,
      vicinity,
      reviews_json,
      timezone_id,
      latitude,
      longitude,
      photos_json,
      primary_photo_url,
      photo_count,
      parent_destination_id
    `)
    .eq('slug', slug)
    .single();

  // Load parent destination if this is a nested destination
  let parentDestination: Destination | null = null;
  if (destination?.parent_destination_id) {
    const { data: parent } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, image')
      .eq('id', destination.parent_destination_id)
      .single();
    if (parent) parentDestination = parent as Destination;
  }

  // Load nested destinations if this is a parent
  let nestedDestinations: Destination[] = [];
  if (destination?.id) {
    const { data: nested } = await supabase.rpc('get_nested_destinations', {
      parent_id: destination.id,
    });
    if (nested) nestedDestinations = nested as Destination[];
  }

  // If destination not found, show 404
  if (error || !destination) {
    console.error('[Destination Page] Error fetching destination:', error);
    notFound();
  }

  // Generate structured data schemas
  const schema = generateDestinationSchema(destination as Destination);
  const breadcrumb = generateDestinationBreadcrumb(destination as Destination);
  const faq = generateDestinationFAQ(destination as Destination);

  return (
    <>
      {/* Add structured data (Schema.org JSON-LD) */}
      {/* JSON.stringify() already escapes all special characters - safe for script tags */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />

      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumb),
        }}
      />

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faq),
        }}
      />

      {/* Render client component with server-fetched data */}
      <Suspense fallback={<DetailSkeleton />}>
        <DestinationPageClient 
          initialDestination={{
            ...(destination as Destination),
            nested_destinations: nestedDestinations,
          }}
          parentDestination={parentDestination}
        />
      </Suspense>
    </>
  );
}

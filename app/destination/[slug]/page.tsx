import { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import DetailSkeleton from '@/src/features/detail/DetailSkeleton';

// Revalidate destination pages every hour for ISR
export const revalidate = 3600;
import {
  generateDestinationMetadata,
  generateDestinationSchema,
  generateDestinationBreadcrumb,
  generateDestinationFAQ
} from '@/lib/metadata';
import { createServerClient } from '@/lib/supabase/server';
import { Destination } from '@/types/destination';
import DestinationPageClient from './page-client';

// Validate and sanitize slug - more permissive to handle various slug formats
function validateSlug(slug: string): boolean {
  // Allow lowercase letters, numbers, hyphens, and underscores
  // Also handle URL-encoded slugs
  const decodedSlug = decodeURIComponent(slug);
  return /^[a-z0-9_-]+$/i.test(decodedSlug) && decodedSlug.length > 0;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Decode URL-encoded slug
  try {
    const decodedSlug = decodeURIComponent(slug);
    return generateDestinationMetadata(decodedSlug);
  } catch (error) {
    // If decoding fails, try with original slug
    return generateDestinationMetadata(slug);
  }
}

// Server component wrapper
export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Decode URL-encoded slug (handle both encoded and non-encoded slugs)
  let decodedSlug: string;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch (error) {
    // If decoding fails, use original slug (might not be URL-encoded)
    decodedSlug = slug;
  }
  
  // Validate slug format - more permissive
  if (!decodedSlug || decodedSlug.length === 0) {
    console.error('[Destination Page] Invalid slug:', slug);
    notFound();
  }

  // Fetch destination data on server using server-side client
  const supabase = await createServerClient();
  
  // Try exact match first
  let { data: destination, error } = await supabase
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
      parent_destination_id,
      design_firm,
      design_firm_id,
      architectural_style,
      design_period,
      designer_name,
      architect_info_json,
      web_content_json
    `)
    .eq('slug', decodedSlug)
    .maybeSingle();

  // If not found with exact match, try case-insensitive match
  if (!destination && !error) {
    const { data: caseInsensitiveMatch, error: caseError } = await supabase
      .from('destinations')
      .select('*')
      .ilike('slug', decodedSlug)
      .maybeSingle();
    
    if (caseInsensitiveMatch && !caseError) {
      destination = caseInsensitiveMatch;
      error = null;
    } else {
      error = caseError;
    }
  }

  // If still not found, try with lowercase
  if (!destination && !error) {
    const { data: lowerMatch, error: lowerError } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', decodedSlug.toLowerCase())
      .maybeSingle();
    
    if (lowerMatch && !lowerError) {
      destination = lowerMatch;
      error = null;
    } else if (lowerError) {
      error = lowerError;
    }
  }

  // Load parent destination if this is a nested destination
  let parentDestination: Destination | null = null;
  let siblingDestinations: Destination[] = [];
  if (destination?.parent_destination_id) {
    const { data: parent } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, image')
      .eq('id', destination.parent_destination_id)
      .maybeSingle();
    if (parent) {
      parentDestination = parent as Destination;
      // Fetch sibling destinations (other places inside the same parent)
      const { data: siblings } = await supabase.rpc('get_nested_destinations', {
        parent_id: destination.parent_destination_id,
      });
      if (siblings) {
        // Filter out the current destination from siblings
        siblingDestinations = (siblings as Destination[]).filter(s => s.slug !== destination.slug);
      }
    }
  }

  // Load nested destinations if this is a parent
  let nestedDestinations: Destination[] = [];
  if (destination?.id) {
    const { data: nested } = await supabase.rpc('get_nested_destinations', {
      parent_id: destination.id,
    });
    if (nested) nestedDestinations = nested as Destination[];
  }

  // If destination not found after all attempts, show 404
  if (error) {
    console.error('[Destination Page] Error fetching destination:', error);
    console.error('[Destination Page] Slug attempted:', decodedSlug);
    notFound();
  }
  
  if (!destination) {
    console.error('[Destination Page] Destination not found for slug:', decodedSlug);
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
          siblingDestinations={siblingDestinations}
        />
      </Suspense>
    </>
  );
}

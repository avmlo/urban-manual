import { Suspense } from 'react';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';
import { Metadata } from 'next';
import { generateCityMetadata, generateCityBreadcrumb } from '@/lib/metadata';
import CityPageClient from './page-client';

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  return generateCityMetadata(city);
}

// Server component wrapper
export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;

  // Generate breadcrumb schema
  const breadcrumb = generateCityBreadcrumb(city);

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
        <CityPageClient />
      </Suspense>
    </>
  );
}


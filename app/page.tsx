import { Metadata } from 'next';
import { prefetchHomepageData } from '@/lib/data/fetch-destinations';
import { generateHomeBreadcrumb } from '@/lib/metadata';
import { HomepageDataProvider } from '@/features/homepage/components/HomepageDataProvider';
import { HomepageContent } from '@/features/homepage/components/HomepageContent';
import { AISearchChatWrapper } from '@/features/homepage/components/AISearchChatWrapper';
import InteractiveHero from '@/features/homepage/components/InteractiveHero';
import NavigationBar from '@/features/homepage/components/NavigationBar';

/**
 * Homepage - Progressive Loading Architecture with Client Fallback
 *
 * Architecture:
 * 1. Server attempts to fetch and render with real data (ISR cached)
 * 2. HomepageDataProvider detects empty server data
 * 3. If empty, client-side fetch kicks in automatically
 * 4. Users always see content - either from SSR or client fetch
 *
 * Apple Design System:
 * - Clean, spacious layouts with generous whitespace
 * - SF Pro-inspired typography with tight letter-spacing
 * - Subtle, refined interactions
 * - Monochromatic palette with minimal accents
 */

// ISR: Revalidate in background every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Urban Manual - Curated Travel Destinations Worldwide',
  description:
    'Discover 897+ curated destinations worldwide. AI-powered recommendations, interactive maps, and editorial content for the modern traveler.',
  openGraph: {
    title: 'Urban Manual - Curated Travel Destinations Worldwide',
    description:
      'Discover 897+ curated destinations worldwide. AI-powered recommendations, interactive maps, and editorial content for the modern traveler.',
    url: 'https://www.urbanmanual.co',
    siteName: 'Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Urban Manual - Curated Travel Destinations Worldwide',
    description:
      'Discover 897+ curated destinations worldwide. AI-powered recommendations, interactive maps, and editorial content for the modern traveler.',
  },
};

export default async function HomePage() {
  // Fetch data on server - this is cached via ISR
  // If fetch fails or returns empty, client-side fallback will handle it
  const { destinations, cities, categories } = await prefetchHomepageData();

  // Generate homepage breadcrumb schema for SEO
  // Note: Organization and WebSite schemas are now in layout.tsx for site-wide presence
  const breadcrumbSchema = generateHomeBreadcrumb();

  return (
    <>
      {/* Homepage Breadcrumb Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {/* Data Provider wraps all components needing destination data */}
      <HomepageDataProvider
        serverDestinations={destinations}
        serverCities={cities}
        serverCategories={categories}
      >
        <main
          className="relative bg-[var(--editorial-bg)] text-[var(--editorial-text-primary)]
                     h-[100dvh] overflow-y-auto snap-y snap-mandatory no-scrollbar"
        >
          <h1 className="sr-only">
            Discover the World's Best Hotels, Restaurants & Travel Destinations - The Urban Manual
          </h1>

          {/* Hero Section - snaps to top, natural height */}
          <section className="snap-start flex flex-col justify-center pl-6 md:pl-10 pr-0 py-10 pb-6 md:pb-10">
            <InteractiveHero />
          </section>

          {/* Grid Section - snaps to fill entire screen */}
          <section className="snap-start min-h-[100dvh] w-full px-4 sm:px-6 md:px-10 py-8">
            <NavigationBar />
            <HomepageContent />
          </section>
        </main>

        {/* Destination Drawer - now handled by IntelligentDrawer in layout.tsx */}

        {/* AI Search Chat - modal chat interface */}
        <AISearchChatWrapper />
      </HomepageDataProvider>
    </>
  );
}

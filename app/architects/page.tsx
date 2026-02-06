'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Building2, ArrowLeft } from 'lucide-react';
import { UniversalGrid } from '@/components/UniversalGrid';
import Image from 'next/image';
import { architectNameToSlug } from '@/lib/architect-utils';
import { useItemsPerPage } from '@/hooks/useGridColumns';

interface ArchitectStats {
  architect: string;
  slug: string;
  count: number;
  featuredImage?: string;
}

export default function ArchitectsPage() {
  const router = useRouter();
  const [architectStats, setArchitectStats] = useState<ArchitectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = useItemsPerPage(4);
  const [displayCount, setDisplayCount] = useState(itemsPerPage);

  useEffect(() => {
    fetchArchitectStats();
  }, []);

  const fetchArchitectStats = async () => {
    try {
      // Fetch all destinations with architect info
      const { data, error } = await supabase
        .from('destinations')
        .select('design_firm, image')
        .not('design_firm', 'is', null)
        .neq('design_firm', '');

      if (error) throw error;

      // Count architects and get featured image
      const architectData = (data || []).reduce((acc, dest: any) => {
        const architect = dest.design_firm?.trim();
        if (!architect) return acc;

        if (!acc[architect]) {
          acc[architect] = {
            count: 0,
            featuredImage: dest.image || undefined,
          };
        }
        acc[architect].count += 1;
        // Update featured image if current one doesn't have image but this one does
        if (!acc[architect].featuredImage && dest.image) {
          acc[architect].featuredImage = dest.image;
        }
        return acc;
      }, {} as Record<string, { count: number; featuredImage?: string }>);

      const stats = Object.entries(architectData)
        .map(([architect, data]) => ({
          architect,
          slug: architectNameToSlug(architect),
          count: data.count,
          featuredImage: data.featuredImage,
        }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      setArchitectStats(stats);
    } catch (error) {
      console.error('Error fetching architect stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading architects…</div>
        </div>
      </main>
    );
  }

  // Calculate featured architects (top 3 by count)
  const featuredArchitects = architectStats.slice(0, 3);

  return (
    <main className="relative min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="px-6 md:px-10 lg:px-12 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 ease-out mb-8"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Discovery</span>
          </button>

          {/* Hero Content */}
          <div className="space-y-4 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-black dark:text-white">
              Architects & Designers
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
              Discover destinations designed by renowned architects and designers. Explore the work of visionaries who shape our built environment.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {architectStats.length} architects • {architectStats.reduce((sum, a) => sum + a.count, 0)} destinations
            </p>
          </div>

          {/* Featured Architects */}
          {featuredArchitects.length > 0 && (
            <div className="mb-12 pt-12 border-t border-gray-200 dark:border-gray-800">
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-black dark:text-white">Featured Architects</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Most represented architects in our collection
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredArchitects.map((architectData) => {
                  const { architect, slug, count, featuredImage } = architectData;
                  return (
                    <button
                      key={slug}
                      onClick={() => router.push(`/architect/${slug}`)}
                      className="text-left group"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3 border border-gray-200 dark:border-gray-800">
                        {featuredImage ? (
                          <Image
                            src={featuredImage}
                            alt={architect}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            quality={85}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                            <Building2 className="h-12 w-12 opacity-20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="text-sm font-medium mb-1 text-black dark:text-white">{architect}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{count} {count === 1 ? 'destination' : 'destinations'}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Grid Section */}
      <div className="pb-12 px-6 md:px-10 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {architectStats.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-sm text-gray-600 dark:text-gray-400">No architects found</span>
            </div>
          ) : (
            <>
              <UniversalGrid
                items={architectStats.slice(0, displayCount)}
                gap="sm"
                renderItem={(architectData) => {
                  const { architect, slug, count, featuredImage } = architectData;
                  return (
                    <button
                      key={slug}
                      onClick={() => router.push(`/architect/${slug}`)}
                      className="text-left group"
                    >
                      {/* Square Image Container */}
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3 border border-gray-200 dark:border-gray-800 group-hover:opacity-80 transition-opacity">
                        {featuredImage ? (
                          <Image
                            src={featuredImage}
                            alt={architect}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            quality={80}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                            <Building2 className="h-12 w-12 opacity-20" />
                          </div>
                        )}
                        
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Count badge */}
                        <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-black/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md text-xs font-medium border border-gray-200/50 dark:border-gray-700/50">
                          {count}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-black dark:text-white line-clamp-2">
                          {architect}
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {count} {count === 1 ? 'destination' : 'destinations'}
                        </p>
                      </div>
                    </button>
                  );
                }}
              />

              {/* Show More Button */}
              {displayCount < architectStats.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setDisplayCount(prev => prev + itemsPerPage)}
                    className="px-6 py-3 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-lg hover:opacity-60 transition-all duration-200 ease-out text-gray-900 dark:text-white"
                  >
                    Show More ({architectStats.length - displayCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}


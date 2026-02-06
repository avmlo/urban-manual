/**
 * Design Movement Page Client
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, Calendar, MapPin } from 'lucide-react';
import { DestinationCard } from '@/components/DestinationCard';
import { UniversalGrid } from '@/components/UniversalGrid';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import type { DesignMovement } from '@/types/architecture';
import type { Destination } from '@/types/destination';

interface MovementPageClientProps {
  slug: string;
}

export default function MovementPageClient({ slug }: MovementPageClientProps) {
  const [movement, setMovement] = useState<DesignMovement | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = useItemsPerPage(4);

  useEffect(() => {
    fetchMovement();
    fetchDestinations();
  }, [slug]);

  const fetchMovement = async () => {
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('design_movements')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      setMovement(data);
    } catch (error) {
      console.error('Error fetching movement:', error);
    }
  };

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Get movement ID
      const { data: movementData } = await supabaseClient
        .from('design_movements')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!movementData) {
        setLoading(false);
        return;
      }

      // Fetch destinations with this movement
      const { data, error } = await supabaseClient
        .from('destinations')
        .select(`
          id,
          slug,
          name,
          city,
          country,
          category,
          image,
          image_thumbnail,
          micro_description,
          description,
          architect_id,
          movement_id,
          architectural_significance,
          architect_ref:architects(id, name, slug),
          movement:design_movements(id, name, slug)
        `)
        .eq('movement_id', movementData.id)
        .order('intelligence_score', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Transform data to match Destination type
      const transformed = (data || []).map((dest: any) => ({
        ...dest,
        architect: Array.isArray(dest.architect_ref) && dest.architect_ref.length > 0
          ? dest.architect_ref[0].name
          : dest.architect_ref?.name || null,
        movement: Array.isArray(dest.movement) && dest.movement.length > 0
          ? dest.movement[0].name
          : dest.movement?.name || null,
      }));
      
      setDestinations(transformed as Destination[]);
    } catch (error) {
      console.error('Error fetching destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const paginatedDestinations = destinations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(destinations.length / itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!movement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Movement not found</div>
      </div>
    );
  }

  const movementName = movement.name;
  const periodText =
    movement.period_start && movement.period_end
      ? `${movement.period_start} - ${movement.period_end}`
      : movement.period_start
        ? `Since ${movement.period_start}`
        : '';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{movementName}</h1>
            {movement.description && (
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                {movement.description}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              {periodText && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{periodText}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>{destinations.length} destinations</span>
              </div>
            </div>
            {movement.key_characteristics && movement.key_characteristics.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2 uppercase tracking-wide">
                  Key Characteristics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {movement.key_characteristics.map((char, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white dark:bg-gray-700 rounded-full text-sm border border-gray-200 dark:border-gray-600"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Destinations Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {destinations.length > 0 ? (
          <>
            <UniversalGrid
              items={paginatedDestinations}
              renderItem={(destination) => (
                <DestinationCard
                  key={destination.slug}
                  destination={destination}
                  onClick={() => {}}
                  isVisited={false}
                />
              )}
            />
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No destinations found for this movement yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


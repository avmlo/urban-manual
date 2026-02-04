'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Sparkles, CheckCircle, XCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';

interface EnrichmentStats {
  total: number;
  enriched: number;
  unenriched: number;
  withTags: number;
  withRating: number;
}

export default function EnrichmentAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirect=/enrich-admin');
      return;
    }
    fetchStats();
  }, [user, router]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: destinations, error } = await supabase
        .from('destinations')
        .select('last_enriched_at, tags, rating');

      if (error) throw error;

      const stats: EnrichmentStats = {
        total: destinations?.length || 0,
        enriched: destinations?.filter(d => d.last_enriched_at).length || 0,
        unenriched: destinations?.filter(d => !d.last_enriched_at).length || 0,
        withTags: destinations?.filter(d => d.tags && d.tags.length > 0).length || 0,
        withRating: destinations?.filter(d => d.rating).length || 0,
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrich = async (enrichAll: boolean = false) => {
    if (!confirm(`Are you sure you want to enrich ${enrichAll ? 'ALL' : 'unenriched'} destinations? This will use API credits.`)) {
      return;
    }

    setEnriching(true);
    setProgress({ current: 0, total: 0 });

    try {
      // Fetch destinations to enrich
      let query = supabase
        .from('destinations')
        .select('slug, name, city, category, content');

      if (!enrichAll) {
        query = query.is('last_enriched_at', null);
      }

      const { data: destinations, error } = await query;

      if (error) throw error;

      if (!destinations || destinations.length === 0) {
        alert('No destinations to enrich!');
        setEnriching(false);
        return;
      }

      setProgress({ current: 0, total: destinations.length });

      // Enrich each destination
      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];

        try {
          const response = await fetch('/api/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug: dest.slug,
              name: dest.name,
              city: dest.city,
              category: dest.category,
              content: dest.content,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`❌ Failed to enrich ${dest.name}:`, errorData);
            console.error(`   Status: ${response.status}`);
            console.error(`   Message: ${errorData.message || 'Unknown error'}`);
          } else {
            const result = await response.json();
            console.log(`✅ Successfully enriched: ${dest.name}`);
            if (result.data) {
              console.log(`   Place ID: ${result.data.places.place_id || 'Not found'}`);
              console.log(`   Rating: ${result.data.places.rating || 'N/A'}`);
              console.log(`   Tags: ${result.data.gemini.tags?.length || 0}`);
            }
          }

          setProgress({ current: i + 1, total: destinations.length });

          // Rate limiting - wait 500ms between requests to avoid API quota issues
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Error enriching ${dest.name}:`, error);
        }
      }

      alert('Enrichment complete!');
      fetchStats();
    } catch (error) {
      console.error('Enrichment error:', error);
      alert('Enrichment failed. Check console for details.');
    } finally {
      setEnriching(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <main className="px-4 md:px-6 lg:px-10 py-8 dark:text-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <h1 className="text-4xl font-bold">Destination Enrichment</h1>
          </div>
          <span className="text-gray-600 dark:text-gray-400">
            Enhance destinations with Google Places API + Gemini AI tags
          </span>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="text-3xl font-bold mb-1">{stats.total}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Destinations</div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.enriched}</div>
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Enriched</div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-3xl font-bold text-gray-400">{stats.unenriched}</div>
                <Clock className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.withTags}</div>
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">With AI Tags</div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.withRating}</div>
                <span className="text-xl">⭐</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">With Google Ratings</div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="text-3xl font-bold mb-1">
                {stats.total > 0 ? Math.round((stats.enriched / stats.total) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {enriching && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Enriching destinations...</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Actions</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Enrich Unenriched Destinations</h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Enrich only destinations that haven't been enriched yet ({stats?.unenriched || 0} remaining)
                </span>
              </div>
              <button
                onClick={() => handleEnrich(false)}
                disabled={enriching || (stats?.unenriched || 0) === 0}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enriching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Enriching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Enrich New</span>
                  </>
                )}
              </button>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Re-enrich All Destinations</h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Re-enrich all {stats?.total || 0} destinations (updates existing data)
                </span>
              </div>
              <button
                onClick={() => handleEnrich(true)}
                disabled={enriching}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enriching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Enriching...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Re-enrich All</span>
                  </>
                )}
              </button>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Refresh Stats</h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Reload enrichment statistics
                </span>
              </div>
              <button
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What does enrichment do?</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Fetches real ratings, hours, and photos from Google Places API</li>
            <li>• Generates searchable AI tags using Gemini (e.g., "romantic", "family-friendly")</li>
            <li>• Auto-categorizes based on Google's place types</li>
            <li>• Adds price level indicators ($$, $$$, $$$$)</li>
            <li>• Makes search more accurate and powerful</li>
          </ul>
          <span className="text-xs text-blue-700 dark:text-blue-300 mt-3">
            Cost: ~$0.017 per destination (Places API) + ~$0.00001 (Gemini)
          </span>
        </div>
      </div>
    </main>
  );
}

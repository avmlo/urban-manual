'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Share2, MapPin, Globe, Lock } from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import { RankedDestinationCard } from '@/components/RankedDestinationCard';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/ui/sonner';
import type { Destination } from '@/types/destination';

interface ListData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  emoji?: string;
  color?: string;
  category_filter?: string;
  is_public: boolean;
  destination_count: number;
  created_at: string;
}

interface OwnerProfile {
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export default function PublicListPage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username ? (params.username as string) : '';
  const listSlug = params?.['list-slug'] ? (params['list-slug'] as string) : '';

  const [list, setList] = useState<ListData | null>(null);
  const [destinations, setDestinations] = useState<(Destination & { rank?: number; curator_notes?: string })[]>([]);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadListData();
  }, [username, listSlug]);

  const loadListData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Resolve username to user_id
      const searchResponse = await fetch(`/api/users/search?q=${encodeURIComponent(username)}`);
      const { users } = await searchResponse.json();
      const userProfile = users?.find((u: any) => u.username === username);

      if (!userProfile) {
        setError('User not found');
        return;
      }

      // Fetch list data
      const listResponse = await fetch(`/api/users/${userProfile.user_id}/lists/${encodeURIComponent(listSlug)}`);

      if (!listResponse.ok) {
        if (listResponse.status === 403) {
          setError('This list is private');
        } else if (listResponse.status === 404) {
          setError('List not found');
        } else {
          setError('Failed to load list');
        }
        return;
      }

      const data = await listResponse.json();
      setList(data.list);
      setDestinations(data.destinations || []);
      setOwner(data.owner);
    } catch (err) {
      console.error('Error loading list:', err);
      setError('Failed to load list');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/user/${username}/lists/${listSlug}`;
    const copied = await copyToClipboard(url);
    if (copied) {
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20">
        <PageLoader />
      </main>
    );
  }

  if (error || !list) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20">
        <div className="w-full text-center">
          <div className="text-5xl mb-4">{error === 'This list is private' ? '🔒' : '❓'}</div>
          <h1 className="text-2xl font-light mb-2">{error || 'List not found'}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {error === 'This list is private'
              ? 'This list is not publicly available'
              : 'The list you are looking for does not exist'}
          </p>
          <button
            onClick={() => router.push(owner ? `/user/${username}` : '/')}
            className="text-sm font-medium text-gray-900 dark:text-white hover:underline"
          >
            {owner ? `Back to @${username}` : 'Go home'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-white dark:bg-gray-950">
      {/* Header Background */}
      <div className="h-48 w-full bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800" />

      <div className="max-w-5xl mx-auto px-6 md:px-10 -mt-12">
        {/* Back Link */}
        <button
          onClick={() => router.push(`/user/${username}`)}
          className="mb-6 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to @{username}
        </button>

        {/* Owner Mini-Header */}
        {owner && (
          <Link
            href={`/user/${username}`}
            className="flex items-center gap-3 mb-6 group"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
              {owner.avatar_url ? (
                <Image
                  src={owner.avatar_url}
                  alt={owner.display_name || owner.username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                  {(owner.display_name || owner.username)?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
              {owner.display_name || owner.username}
            </span>
          </Link>
        )}

        {/* List Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center text-3xl">
                {list.emoji || '📋'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {list.name}
                </h1>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 font-medium">
                  <span>{destinations.length} {destinations.length === 1 ? 'place' : 'places'}</span>
                  {list.category_filter && (
                    <>
                      <span>·</span>
                      <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                        {list.category_filter}
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    {list.is_public ? (
                      <>
                        <Globe className="h-3 w-3" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" />
                        <span>Private</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {list.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
                {list.description}
              </p>
            )}
          </div>

          {/* Share Button */}
          {list.is_public && (
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-xs font-medium flex items-center gap-2 shadow-sm"
            >
              <Share2 className="h-3 w-3" />
              Share
            </button>
          )}
        </div>

        {/* Destinations Grid */}
        <div className="pb-20">
          {destinations.length === 0 ? (
            <div className="text-center py-16 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="text-5xl mb-4">🏞️</div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                No places in this list yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-start">
              {destinations.map((destination) => (
                <RankedDestinationCard
                  key={destination.slug}
                  destination={destination}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { MapPin, Users, Heart, Calendar } from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const username = params.username as string;

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [username]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);

      // First, get user_id from username
      const response = await fetch(`/api/users/search?q=${username}`);
      const { users } = await response.json();

      const userProfile = users?.find((u: any) => u.username === username);
      if (!userProfile) {
        router.push('/404');
        return;
      }

      // Get full profile
      const profileResponse = await fetch(`/api/users/${userProfile.user_id}`);
      const data = await profileResponse.json();

      setProfile(data.profile);
      setStats(data.stats);
      setCollections(data.collections);
      setIsFollowing(data.isFollowing);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await fetch(`/api/users/${profile.user_id}/follow`, { method: 'DELETE' });
        setIsFollowing(false);
      } else {
        await fetch(`/api/users/${profile.user_id}/follow`, { method: 'POST' });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20">
        <PageLoader />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20">
        <div className="w-full text-center">
          <h1 className="text-2xl font-light mb-4">User not found</h1>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-black dark:hover:text-white transition-colors"
          >
            Go back home
          </button>
        </div>
      </main>
    );
  }

  const isOwnProfile = currentUser?.id === profile.user_id;

  return (
    <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
      <div className="w-full">
        {/* Profile Header */}
        <div className="mb-12">
          <div className="flex items-start gap-6 mb-6">
            {/* Avatar */}
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name || profile.username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-gray-400">
                  {(profile.display_name || profile.username)?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-light">{profile.display_name || profile.username}</h1>
                {!isOwnProfile && currentUser && (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`px-6 py-2 text-sm font-medium rounded-2xl transition-all ${
                      isFollowing
                        ? 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                        : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80'
                    }`}
                  >
                    {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
                {isOwnProfile && (
                  <button
                    onClick={() => router.push('/account')}
                    className="px-6 py-2 text-sm font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {profile.username && (
                <p className="text-sm text-gray-500 mb-3">@{profile.username}</p>
              )}

              {profile.bio && (
                <p className="text-sm mb-4">{profile.bio}</p>
              )}

              {profile.location && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location}</span>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="font-medium">{stats.visitedCount}</span>{' '}
                  <span className="text-gray-500">visited</span>
                </div>
                <div>
                  <span className="font-medium">{stats.savedCount}</span>{' '}
                  <span className="text-gray-500">saved</span>
                </div>
                <div>
                  <span className="font-medium">{stats.followerCount}</span>{' '}
                  <span className="text-gray-500">followers</span>
                </div>
                <div>
                  <span className="font-medium">{stats.followingCount}</span>{' '}
                  <span className="text-gray-500">following</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Public Collections */}
        <div>
          <h2 className="text-lg font-light mb-6">
            {isOwnProfile ? 'Your Public Collections' : 'Public Collections'}
          </h2>

          {collections.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No public collections yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => router.push(`/collection/${collection.id}`)}
                  className="text-left p-6 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{collection.emoji || '📚'}</span>
                    <h3 className="font-medium text-lg flex-1">{collection.name}</h3>
                  </div>
                  {collection.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {collection.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{collection.destination_count || 0} places</span>
                    {collection.view_count > 0 && (
                      <span>{collection.view_count} views</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

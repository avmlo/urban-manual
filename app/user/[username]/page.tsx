'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { MapPin, Users, Heart, Calendar } from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import { Button } from '@/ui/button';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const username = params?.username ? (params.username as string) : '';

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [lists, setLists] = useState<any[]>([]);
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
      setLists(data.lists || data.collections || []);
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
          <Button
            type="button"
            variant="subtle"
            size="xs"
            onClick={() => router.push('/')}
            className="px-0"
          >
            Go back home
          </Button>
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
                  <Button
                    type="button"
                    onClick={handleFollow}
                    disabled={followLoading}
                    variant={isFollowing ? 'outline' : 'default'}
                    size="sm"
                    aria-pressed={isFollowing}
                    className="min-w-[112px]"
                  >
                    {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}
                {isOwnProfile && (
                  <Button
                    type="button"
                    onClick={() => router.push('/account')}
                    variant="outline"
                    size="sm"
                  >
                    Edit Profile
                  </Button>
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

        {/* Public Lists */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isOwnProfile ? 'Your Lists' : 'Lists'}
            </h2>
            {lists.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lists.length} {lists.length === 1 ? 'list' : 'lists'}
              </p>
            )}
          </div>

          {lists.length === 0 ? (
            <div className="text-center py-16 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {isOwnProfile ? 'No public lists yet' : 'No lists yet'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isOwnProfile
                  ? 'Create a list and make it public to share with others'
                  : 'This user hasn\'t shared any lists yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => router.push(
                    list.slug
                      ? `/user/${username}/lists/${list.slug}`
                      : `/lists/${list.id}`
                  )}
                  className="text-left p-6 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all bg-white dark:bg-gray-900"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <span className="text-4xl flex-shrink-0">{list.emoji || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-1 text-gray-900 dark:text-white">
                        {list.name}
                      </h3>
                      {list.category_filter && (
                        <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 mb-1">
                          {list.category_filter}
                        </span>
                      )}
                      {list.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {list.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {list.destination_count || 0} {list.destination_count === 1 ? 'place' : 'places'}
                    </span>
                    {list.view_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {list.view_count} {list.view_count === 1 ? 'view' : 'views'}
                      </span>
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

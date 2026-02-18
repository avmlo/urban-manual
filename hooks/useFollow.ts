'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryMutation } from '@/hooks/useQueryFetching';

interface UseFollowOptions {
  targetUserId: string;
  initialIsFollowing?: boolean;
}

interface UseFollowReturn {
  isFollowing: boolean;
  isLoading: boolean;
  followerCount: number;
  toggleFollow: () => Promise<void>;
  requiresAuth: boolean;
}

/**
 * Hook for follow/unfollow user actions with optimistic UI updates
 */
export function useFollow({ targetUserId, initialIsFollowing = false }: UseFollowOptions): UseFollowReturn {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(0);

  // Sync with initial value when it changes
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const { mutateAsync, isPending } = useQueryMutation<void, { action: 'follow' | 'unfollow' }>(
    async ({ action }) => {
      const response = await fetch(`/api/users/${targetUserId}/follow`, {
        method: action === 'follow' ? 'POST' : 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Follow action failed');
      }
    },
  );

  const toggleFollow = async () => {
    if (!user?.id || !targetUserId) return;
    if (user.id === targetUserId) return;

    // Optimistic update
    const previousState = isFollowing;
    const previousCount = followerCount;
    setIsFollowing(!isFollowing);
    setFollowerCount(prev => isFollowing ? prev - 1 : prev + 1);

    try {
      await mutateAsync({ action: isFollowing ? 'unfollow' : 'follow' });
    } catch (error) {
      // Revert optimistic update on error
      setIsFollowing(previousState);
      setFollowerCount(previousCount);
      console.error('Error toggling follow:', error);
    }
  };

  return {
    isFollowing,
    isLoading: isPending,
    followerCount,
    toggleFollow,
    requiresAuth: !user,
  };
}

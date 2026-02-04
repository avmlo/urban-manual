'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Loader2 } from "lucide-react";

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'following'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="px-4 md:px-6 lg:px-10 py-8 dark:text-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Activity Feed</h1>
          <span className="text-base text-gray-600 dark:text-gray-400">
            See what's happening in the travel community
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'all'
                ? 'text-black dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            All Activity
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'following'
                ? 'text-black dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
            }`}
          >
            Following
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white" />
            )}
          </button>
        </div>

        {/* Activity Feed */}
        <ActivityFeed followingOnly={activeTab === 'following'} limit={50} />
      </div>
    </main>
  );
}

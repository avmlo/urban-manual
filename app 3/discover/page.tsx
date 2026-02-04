'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, TrendingUp, Heart, Tag, AlertTriangle, Info, Network, BookOpen, Lock } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

// ML Components
import { ForYouSectionML } from '@/components/ForYouSectionML';
import { TrendingSectionML } from '@/components/TrendingSectionML';
import { SentimentDisplay } from '@/components/SentimentDisplay';
import { CitySentimentDisplay } from '@/components/CitySentimentDisplay';
import { TopicsDisplay } from '@/components/TopicsDisplay';
import { AnomalyAlert } from '@/components/AnomalyAlert';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { SequencePredictions } from '@/components/SequencePredictions';

// Hooks
import { useMLTopics } from '@/hooks/useMLTopics';
import { useMLAnomaly } from '@/hooks/useMLAnomaly';
import { useMLSequence } from '@/hooks/useMLSequence';

type TabType = 'recommendations' | 'trending' | 'sentiment' | 'topics' | 'anomalies' | 'explain' | 'sequences' | 'collections';

export default function DiscoverPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('recommendations');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [collections, setCollections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [loading, setLoading] = useState(true);

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setAuthChecked(true);
        setIsAdmin(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const role = (session.user.app_metadata as Record<string, any> | null)?.role;
          setIsAdmin(role === 'admin');
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setAuthChecked(true);
      }
    }

    checkAdmin();
  }, [user]);

  // Sequence prediction demo
  const [currentSequence, setCurrentSequence] = useState<string[]>([]);
  const { predictions, predict } = useMLSequence({ enabled: true });

  useEffect(() => {
    if (activeTab === 'collections') {
    loadCollections();
    }
  }, [sortBy, activeTab]);

  useEffect(() => {
    if (activeTab === 'collections' && searchQuery.trim()) {
    const timer = setTimeout(() => {
        loadCollections();
    }, 300);
    return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        sort: sortBy,
        ...(searchQuery.trim() && { q: searchQuery })
      });

      const response = await fetch(`/api/collections/discover?${params}`);
      const data = await response.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'recommendations' as TabType, label: 'For You', icon: Sparkles, description: 'Personalized recommendations' },
    { id: 'trending' as TabType, label: 'Trending', icon: TrendingUp, description: 'Rising destinations' },
    { id: 'sentiment' as TabType, label: 'Sentiment', icon: Heart, description: 'Mood analysis' },
    { id: 'topics' as TabType, label: 'Topics', icon: Tag, description: 'Trending themes' },
    { id: 'anomalies' as TabType, label: 'Anomalies', icon: AlertTriangle, description: 'Unusual patterns' },
    { id: 'explain' as TabType, label: 'Explain AI', icon: Info, description: 'Why recommended?' },
    { id: 'sequences' as TabType, label: 'Predictions', icon: Network, description: 'Next actions' },
    { id: 'collections' as TabType, label: 'Collections', icon: BookOpen, description: 'Curated lists' },
  ];

  // Show loading state while checking auth
  if (!authChecked) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center py-20">
            <p className="text-sm text-gray-500">Checking access...</p>
          </div>
        </div>
      </main>
    );
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center py-20">
            <Lock className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-light mb-2">Admin Access Required</h1>
            <p className="text-sm text-gray-500 mb-6">
              This ML showcase is only available to administrators.
            </p>
            {!user ? (
              <button
                onClick={() => router.push('/auth/login')}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={() => router.push('/account')}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm"
              >
                Go to Account
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-light">Discover with AI</h1>
            <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
              Admin Only
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Explore destinations powered by machine learning and artificial intelligence
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-2">Personalized Recommendations</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Powered by collaborative filtering - learns from your behavior and similar users
                </p>
              </div>
              <ForYouSectionML />
            </div>
          )}

          {/* Trending Tab */}
          {activeTab === 'trending' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-2">Trending Destinations</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Forecasted using Prophet time-series analysis - destinations with rising demand
                </p>
              </div>
              <TrendingSectionML limit={20} forecastDays={7} />
            </div>
          )}

          {/* Sentiment Tab */}
          {activeTab === 'sentiment' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-2">Sentiment Analysis</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Analyze sentiment trends for cities or destinations using BERT/RoBERTa models
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    placeholder="Enter city name (e.g., Tokyo, Paris)"
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                {selectedCity && (
                  <CitySentimentDisplay city={selectedCity} days={30} />
                )}
                {!selectedCity && (
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
                    <Heart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      Enter a city name above to analyze sentiment trends
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Topics Tab */}
          {activeTab === 'topics' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-2">Topic Modeling</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Extract trending topics and keywords using BERTopic - discover what people are talking about
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    placeholder="Enter city name (e.g., Tokyo, Paris)"
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                {selectedCity && (
                  <TopicsDisplay city={selectedCity} minTopicSize={5} />
                )}
                {!selectedCity && (
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
                    <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      Enter a city name above to extract trending topics
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Anomalies Tab */}
          {activeTab === 'anomalies' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-2">Anomaly Detection</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Detect unusual traffic patterns using Isolation Forest - identify destinations with unexpected activity
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    placeholder="Enter city name (e.g., Tokyo, Paris)"
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                {selectedCity && (
                  <AnomalyAlert city={selectedCity} type="traffic" days={30} />
                )}
                {!selectedCity && (
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      Enter a city name above to detect anomalies
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Explain AI Tab */}
          {activeTab === 'explain' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-2">Explainable AI</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Understand why destinations were recommended using SHAP/LIME explanations
                </p>
              </div>
              {user ? (
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      To see explanations, visit a destination page and look for the "Why recommended?" button on ML-powered recommendations.
                    </p>
                    <div className="flex items-center gap-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Info className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <div className="text-sm">
                        <p className="font-medium text-purple-900 dark:text-purple-100">
                          How it works
                        </p>
                        <p className="text-purple-700 dark:text-purple-300 mt-1">
                          When you see ML recommendations, hover over them to see explanations showing which features (your preferences, destination attributes) influenced the recommendation.
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                      <p className="text-xs text-gray-500 mb-2">Try it out:</p>
                      <button
                        onClick={() => router.push('/')}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Go to homepage → View "For You" section → Hover over recommendations
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
                  <Info className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-500 mb-4">
                    Sign in to see personalized explanations
                  </p>
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Sequences Tab */}
          {activeTab === 'sequences' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-2">Sequence Prediction</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Predict next user actions based on browsing patterns using sequence models
                </p>
              </div>
              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                  <label className="block text-sm font-medium mb-2">
                    Simulate browsing sequence (comma-separated):
                  </label>
                  <input
                    type="text"
                    value={currentSequence.join(', ')}
                    onChange={(e) => {
                      const seq = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setCurrentSequence(seq);
                      if (seq.length > 0) {
                        predict(seq, 3);
                      }
                    }}
                    placeholder="e.g., view, save, search, filter"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm mb-4"
                  />
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => {
                        const seq = [...currentSequence, 'view'];
                        setCurrentSequence(seq);
                        predict(seq, 3);
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg"
                    >
                      + view
                    </button>
                    <button
                      onClick={() => {
                        const seq = [...currentSequence, 'save'];
                        setCurrentSequence(seq);
                        predict(seq, 3);
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg"
                    >
                      + save
                    </button>
                    <button
                      onClick={() => {
                        const seq = [...currentSequence, 'search'];
                        setCurrentSequence(seq);
                        predict(seq, 3);
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg"
                    >
                      + search
                    </button>
                    <button
                      onClick={() => {
                        setCurrentSequence([]);
                      }}
                      className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"
                    >
                      Clear
                    </button>
                  </div>
                  {currentSequence.length > 0 && (
                    <SequencePredictions currentSequence={currentSequence} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Collections Tab */}
          {activeTab === 'collections' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-2">Discover Collections</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Explore curated travel collections from the community
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collections..."
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:border-black dark:focus:border-white text-sm"
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        {/* Collections Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-sm">Loading...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-sm">No collections found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => router.push(`/collection/${collection.id}`)}
                className="text-left p-6 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                {/* Collection Header */}
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-4xl">{collection.emoji || '📚'}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-lg mb-1 line-clamp-1">
                      {collection.name}
                    </h3>
                    {collection.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Creator Info */}
                {collection.user_profiles && (
                  <div className="flex items-center gap-2 mb-4">
                    {collection.user_profiles.avatar_url ? (
                      <div className="relative w-6 h-6 rounded-full overflow-hidden">
                        <Image
                          src={collection.user_profiles.avatar_url}
                          alt={collection.user_profiles.display_name || collection.user_profiles.username}
                          fill
                          className="object-cover"
                          sizes="24px"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                        {(collection.user_profiles.display_name || collection.user_profiles.username)?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-500">
                      by {collection.user_profiles.display_name || collection.user_profiles.username}
                    </span>
                  </div>
                )}

                {/* Stats */}
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
          )}
        </div>
      </div>
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/personalization';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cityCountryMap } from '@/data/cityCountryMap';

const ALL_CITIES = Object.keys(cityCountryMap).map(city => 
  city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
);

const CATEGORIES = ['Hotels', 'Restaurants', 'Cafes', 'Bars', 'Shops', 'Museums', 'Parks', 'Spas'];
const TRAVEL_STYLES = ['Luxury', 'Budget', 'Adventure', 'Relaxation', 'Balanced'];
const DIETARY_PREFERENCES = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Halal', 'Kosher'];
const INTERESTS = [
  'Michelin Stars', 'Rooftop Bars', 'Boutique Hotels', 'Street Food', 'Fine Dining',
  'Architecture', 'Art Galleries', 'Shopping', 'Nightlife', 'Spas', 'Beaches', 'Mountains'
];

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    favorite_cities: [],
    favorite_categories: [],
    dietary_preferences: [],
    price_preference: 2,
    interests: [],
    travel_style: 'Balanced',
    privacy_mode: false,
    allow_tracking: true,
    email_notifications: true,
  });

  useEffect(() => {
    if (!user) {
      router.push('/account');
      return;
    }
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          ...profile,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      router.push('/account');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function toggleArrayItem(array: string[] | undefined, item: string): string[] {
    const arr = array || [];
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mb-4"
            aria-label="Back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold">Profile & Preferences</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Customize your travel preferences to get better recommendations
          </p>
        </div>

        <div className="space-y-6">
          {/* Travel Style */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Travel Style</h2>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_STYLES.map(style => (
                <button
                  key={style}
                  onClick={() => setProfile({ ...profile, travel_style: style as any })}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    profile.travel_style === style
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </section>

          {/* Favorite Cities */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Favorite Cities</h2>
            <div className="flex flex-wrap gap-2">
              {ALL_CITIES.slice(0, 30).map(city => (
                <button
                  key={city}
                  onClick={() => setProfile({
                    ...profile,
                    favorite_cities: toggleArrayItem(profile.favorite_cities, city)
                  })}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    profile.favorite_cities?.includes(city)
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </section>

          {/* Favorite Categories */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Favorite Categories</h2>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setProfile({
                    ...profile,
                    favorite_categories: toggleArrayItem(profile.favorite_categories, category)
                  })}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    profile.favorite_categories?.includes(category)
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>

          {/* Price Preference */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Price Preference</h2>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(level => (
                <button
                  key={level}
                  onClick={() => setProfile({ ...profile, price_preference: level })}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    profile.price_preference === level
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {'$'.repeat(level)}
                </button>
              ))}
            </div>
          </section>

          {/* Dietary Preferences */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Dietary Preferences</h2>
            <div className="flex flex-wrap gap-2">
              {DIETARY_PREFERENCES.map(pref => (
                <button
                  key={pref}
                  onClick={() => setProfile({
                    ...profile,
                    dietary_preferences: toggleArrayItem(profile.dietary_preferences, pref)
                  })}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    profile.dietary_preferences?.includes(pref)
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </section>

          {/* Interests */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  onClick={() => setProfile({
                    ...profile,
                    interests: toggleArrayItem(profile.interests, interest)
                  })}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    profile.interests?.includes(interest)
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </section>

          {/* Settings */}
          <section className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Privacy & Settings</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium">Privacy Mode</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Hide your activity from other users
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={profile.privacy_mode || false}
                  onChange={(e) => setProfile({ ...profile, privacy_mode: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium">Allow Tracking</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Help us improve recommendations
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={profile.allow_tracking !== false}
                  onChange={(e) => setProfile({ ...profile, allow_tracking: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Get updates about new recommendations
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={profile.email_notifications !== false}
                  onChange={(e) => setProfile({ ...profile, email_notifications: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex gap-3">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Preferences
                </>
              )}
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


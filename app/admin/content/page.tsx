'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Image,
  ArrowRight,
  Plus,
  Layout,
  Globe,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface ContentSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  count?: number;
  color: string;
}

export default function CMSPage() {
  const [stats, setStats] = useState<{ destinations: number; cities: number; categories: number }>({
    destinations: 0,
    cities: 0,
    categories: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: destCount, error: destErr },
          { count: cityCount, error: cityErr },
          { count: catCount, error: catErr },
        ] = await Promise.all([
          supabase.from('destinations').select('*', { count: 'exact', head: true }),
          supabase.from('destinations').select('city', { count: 'exact', head: true }).not('city', 'is', null),
          supabase.from('destinations').select('category', { count: 'exact', head: true }).not('category', 'is', null),
        ]);

        if (destErr) console.error('Failed to fetch destination count:', destErr.message);
        if (cityErr) console.error('Failed to fetch city count:', cityErr.message);
        if (catErr) console.error('Failed to fetch category count:', catErr.message);

        setStats({
          destinations: destCount || 0,
          cities: cityCount || 0,
          categories: catCount || 0,
        });
      } catch (err) {
        console.error('Failed to fetch CMS stats:', err);
      }
    };
    fetchStats();
  }, []);

  const sections: ContentSection[] = [
    {
      title: 'Destinations',
      description: 'Manage travel destinations, add new places, edit details',
      icon: <MapPin className="w-5 h-5" />,
      href: '/admin/destinations',
      count: stats.destinations,
      color: 'gray',
    },
    {
      title: 'Media Library',
      description: 'Upload and manage images, photos, and media files',
      icon: <Image className="w-5 h-5" />,
      href: '/admin/media',
      color: 'gray',
    },
    {
      title: 'Categories',
      description: 'Manage destination categories and tags',
      icon: <Layout className="w-5 h-5" />,
      href: '/admin/categories',
      color: 'gray',
    },
    {
      title: 'Homepage',
      description: 'Configure homepage layout, featured content, hero section',
      icon: <Globe className="w-5 h-5" />,
      href: '/admin/settings',
      color: 'gray',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Content Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage all content across Urban Manual
          </p>
        </div>
        <Link
          href="/admin/destinations"
          className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium transition-colors hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </Link>
      </div>

      {/* Content Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="group relative p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
          >
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {section.icon}
                </div>
                {section.count !== undefined && section.count > 0 && (
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {section.count.toLocaleString()} items
                  </span>
                )}
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                {section.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                {section.description}
              </p>

              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                Manage
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Content Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.destinations.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Destinations</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.cities}
            </p>
            <p className="text-xs text-gray-500 mt-1">Cities</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.categories}
            </p>
            <p className="text-xs text-gray-500 mt-1">Categories</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">4</p>
            <p className="text-xs text-gray-500 mt-1">Content Types</p>
          </div>
        </div>
      </div>
    </div>
  );
}

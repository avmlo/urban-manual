'use client';

import { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit3,
  Search,
  ChevronUp,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface Category {
  name: string;
  count: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: '#ef4444',
  hotel: '#3b82f6',
  bar: '#8b5cf6',
  cafe: '#f59e0b',
  gallery: '#ec4899',
  museum: '#6366f1',
  shop: '#10b981',
  landmark: '#f97316',
  park: '#22c55e',
  beach: '#06b6d4',
  market: '#eab308',
  spa: '#a855f7',
  club: '#f43f5e',
  theater: '#dc2626',
  other: '#6b7280',
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'count'>('count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await supabase
          .from('destinations')
          .select('category');

        const categoryCounts: Record<string, number> = {};
        data?.forEach(d => {
          if (d.category) {
            categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
          }
        });

        const categoryList = Object.entries(categoryCounts).map(([name, count]) => ({
          name,
          count,
          color: CATEGORY_COLORS[name.toLowerCase()] || '#6b7280',
        }));

        setCategories(categoryList);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSort = (field: 'name' | 'count') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredCategories = categories
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'name') {
        return a.name.localeCompare(b.name) * multiplier;
      }
      return (a.count - b.count) * multiplier;
    });

  const totalDestinations = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Categories</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {categories.length} categories across {totalDestinations} destinations
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium transition-colors hover:opacity-90">
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search categories..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600"
        />
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))
        ) : filteredCategories.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No categories found
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div
              key={category.name}
              className="group relative p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
            >
              {/* Color indicator */}
              <div
                className="absolute top-3 right-3 w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <Layers className="w-5 h-5" style={{ color: category.color }} />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize mb-1">
                {category.name}
              </h3>
              <p className="text-sm text-gray-500">
                {category.count} destinations
              </p>

              {/* Progress bar */}
              <div className="mt-4 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(category.count / (filteredCategories[0]?.count || 1)) * 100}%`,
                    backgroundColor: category.color,
                  }}
                />
              </div>

              {/* Actions on hover */}
              <div className="absolute top-3 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">All Categories</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800/50">
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                >
                  Category
                  {sortField === 'name' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('count')}
                  className="flex items-center gap-1 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                >
                  Destinations
                  {sortField === 'count' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
                % of Total
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {filteredCategories.map((category) => (
              <tr key={category.name} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-900 dark:text-white capitalize">{category.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{category.count}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full max-w-[100px]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(category.count / totalDestinations) * 100}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {((category.count / totalDestinations) * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

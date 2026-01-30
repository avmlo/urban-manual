'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
          {categories.length} categories · {totalDestinations} destinations
        </p>
      </div>

      {/* Search */}
      <div className="pb-2">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-9 pr-3 py-1.5 h-8 text-xs rounded-lg border-transparent bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-200 dark:focus:border-gray-700 focus:bg-white dark:focus:bg-gray-900 border transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800/50">
              <th className="text-left px-2 py-2">
                <button
                  onClick={() => handleSort('name')}
                  className={`flex items-center gap-1 text-[11px] uppercase tracking-wider font-medium transition-colors ${
                    sortField === 'name'
                      ? 'text-black/60 dark:text-gray-300'
                      : 'text-black/25 dark:text-gray-600 hover:text-black/50 dark:hover:text-gray-400'
                  }`}
                >
                  Category
                  {sortField === 'name' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
                  )}
                </button>
              </th>
              <th className="text-left px-2 py-2">
                <button
                  onClick={() => handleSort('count')}
                  className={`flex items-center gap-1 text-[11px] uppercase tracking-wider font-medium transition-colors ${
                    sortField === 'count'
                      ? 'text-black/60 dark:text-gray-300'
                      : 'text-black/25 dark:text-gray-600 hover:text-black/50 dark:hover:text-gray-400'
                  }`}
                >
                  Destinations
                  {sortField === 'count' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
                  )}
                </button>
              </th>
              <th className="text-left px-2 py-2">
                <span className="text-[11px] uppercase tracking-wider text-black/25 dark:text-gray-600 font-medium">
                  % of Total
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/30">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-2 py-2"><div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                  <td className="px-2 py-2"><div className="h-4 w-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                  <td className="px-2 py-2"><div className="h-1 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-2 py-12 text-center text-[13px] text-gray-400">
                  No categories found
                </td>
              </tr>
            ) : (
              filteredCategories.map((category) => (
                <tr key={category.name} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-[13px] text-gray-900 dark:text-white capitalize">{category.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <span className="text-[13px] text-gray-400 dark:text-gray-500 tabular-nums">{category.count}</span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full max-w-[80px]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(category.count / totalDestinations) * 100}%`,
                            backgroundColor: category.color,
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400 tabular-nums">
                        {((category.count / totalDestinations) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

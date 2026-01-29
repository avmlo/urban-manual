'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MapPin, Building2, Globe, Map, Compass, Layers, MoreHorizontal, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Collection {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  table: string;
}

const COLLECTIONS: Collection[] = [
  { id: 'destinations', label: 'Destinations', href: '/admin/destinations', icon: MapPin, table: 'destinations' },
  { id: 'cities', label: 'Cities', href: '/admin/cities', icon: MapPin, table: 'cities' },
  { id: 'neighborhoods', label: 'Neighborhoods', href: '/admin/neighborhoods', icon: Map, table: 'neighborhoods' },
  { id: 'countries', label: 'Countries', href: '/admin/countries', icon: Globe, table: 'countries' },
  { id: 'brands', label: 'Brands', href: '/admin/brands', icon: Building2, table: 'brands' },
  { id: 'architects', label: 'Architects', href: '/admin/architects', icon: Compass, table: 'architects' },
  { id: 'categories', label: 'Categories', href: '/admin/categories', icon: Layers, table: '' },
];

export function CmsCollectionsSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCounts = async () => {
      const results = await Promise.all(
        COLLECTIONS.filter(c => c.table).map(async (col) => {
          const { count } = await supabase
            .from(col.table)
            .select('*', { count: 'exact', head: true });
          return { id: col.id, count: count || 0 };
        })
      );
      const countMap: Record<string, number> = {};
      results.forEach(r => { countMap[r.id] = r.count; });
      setCounts(countMap);
    };
    fetchCounts();
  }, []);

  const activeCollection = COLLECTIONS.find(c =>
    c.href !== '/admin/destinations'
      ? pathname?.startsWith(c.href)
      : pathname === c.href
  );

  return (
    <div className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Collections
        </span>
      </div>

      {/* Collection List */}
      <nav className="flex-1 overflow-y-auto py-1">
        {COLLECTIONS.map((col) => {
          const Icon = col.icon;
          const isActive = activeCollection?.id === col.id;
          return (
            <button
              key={col.id}
              onClick={() => router.push(col.href)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 flex-shrink-0 opacity-60" />
                <span className="truncate">{col.label}</span>
              </span>
              {counts[col.id] !== undefined && (
                <span className={`text-xs tabular-nums ${isActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {counts[col.id]}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

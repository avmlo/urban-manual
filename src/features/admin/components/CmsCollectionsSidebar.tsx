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
    <nav className="w-48 flex-shrink-0 pr-6 border-r border-gray-100 dark:border-gray-800/60 mr-8 pt-1">
      <div className="space-y-0.5">
        {COLLECTIONS.map((col) => {
          const Icon = col.icon;
          const isActive = activeCollection?.id === col.id;
          return (
            <button
              key={col.id}
              onClick={() => router.push(col.href)}
              className={`w-full flex items-center justify-between py-1.5 text-[13px] transition-colors ${
                isActive
                  ? 'text-black dark:text-white font-medium'
                  : 'text-black/30 dark:text-gray-500 hover:text-black dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{col.label}</span>
              </span>
              {counts[col.id] !== undefined && (
                <span className="text-[11px] tabular-nums opacity-60">
                  {counts[col.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

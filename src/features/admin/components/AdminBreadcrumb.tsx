'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const LABEL_MAP: Record<string, string> = {
  admin: 'Admin',
  destinations: 'Destinations',
  brands: 'Brands',
  architects: 'Architects',
  cities: 'Cities',
  countries: 'Countries',
  neighborhoods: 'Neighborhoods',
  categories: 'Categories',
  content: 'CMS',
  media: 'Media',
  analytics: 'Analytics',
  searches: 'Searches',
  enrich: 'Enrich',
  users: 'Users',
  settings: 'Settings',
  performance: 'Performance',
  realtime: 'Real-Time',
  reindex: 'Reindex',
  discover: 'Discover',
};

export function AdminBreadcrumb() {
  const pathname = usePathname();
  if (!pathname || pathname === '/admin') return null;

  const segments = pathname.split('/').filter(Boolean);
  // Only show breadcrumbs if we're deeper than /admin
  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
            {crumb.isLast ? (
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if items not provided
  const breadcrumbItems = items || generateBreadcrumbs(pathname);

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-sm ${className}`}>
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="sr-only">Admin Home</span>
      </Link>

      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        return (
          <Fragment key={index}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            {isLast || !item.href ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

/**
 * Generate breadcrumbs from pathname
 */
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Remove /admin prefix and split path
  const path = pathname.replace('/admin', '').split('/').filter(Boolean);

  if (path.length === 0) {
    return [];
  }

  const items: BreadcrumbItem[] = [];
  let currentPath = '/admin';

  path.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === path.length - 1;

    items.push({
      label: formatSegment(segment),
      href: isLast ? undefined : currentPath,
    });
  });

  return items;
}

/**
 * Format URL segment to readable label
 */
function formatSegment(segment: string): string {
  const labelMap: Record<string, string> = {
    destinations: 'Destinations',
    analytics: 'Analytics',
    users: 'Users',
    settings: 'Settings',
    media: 'Media Library',
    enrich: 'Data Enrichment',
    reindex: 'Search Reindex',
    cities: 'Cities',
    countries: 'Countries',
    neighborhoods: 'Neighborhoods',
    brands: 'Brands',
    architects: 'Architects',
    categories: 'Categories',
    content: 'Content',
    discover: 'Discover',
    searches: 'Search Analytics',
    performance: 'Performance',
    realtime: 'Real-time',
  };

  return labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

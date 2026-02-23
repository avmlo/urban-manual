import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

/**
 * Breadcrumb navigation component for nested pages
 * Provides clear wayfinding and navigation hierarchy
 */
export function Breadcrumb({ items, className, showHome = true }: BreadcrumbProps) {
  const allItems = showHome ? [{ label: 'Home', href: '/' }, ...items] : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm text-gray-500 dark:text-gray-400', className)}
    >
      <ol className="flex items-center flex-wrap gap-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isFirst = index === 0;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 mx-1.5 flex-shrink-0 text-gray-300 dark:text-gray-600" />
              )}

              {isLast ? (
                <span
                  className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className={cn(
                    'hover:text-gray-900 dark:hover:text-white transition-colors truncate max-w-[150px]',
                    isFirst && 'flex items-center gap-1'
                  )}
                >
                  {isFirst && showHome && <Home className="h-3.5 w-3.5" />}
                  <span className={isFirst && showHome ? 'sr-only sm:not-sr-only' : ''}>
                    {item.label}
                  </span>
                </Link>
              ) : (
                <span className="truncate max-w-[150px]">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Utility function to generate breadcrumb items for a destination
 */
export function getDestinationBreadcrumbs(
  destinationName: string,
  city: string,
  category?: string
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];

  // Add city
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  items.push({
    label: formatCityName(city),
    href: `/city/${citySlug}`,
  });

  // Add category if provided
  if (category) {
    items.push({
      label: formatCategoryName(category),
      href: `/category/${category.toLowerCase()}`,
    });
  }

  // Add destination (current page, no href)
  items.push({
    label: destinationName,
  });

  return items;
}

/**
 * Utility function to generate breadcrumb items for a city page
 */
export function getCityBreadcrumbs(city: string): BreadcrumbItem[] {
  return [
    {
      label: 'Cities',
      href: '/cities',
    },
    {
      label: formatCityName(city),
    },
  ];
}

/**
 * Utility function to generate breadcrumb items for a category page
 */
export function getCategoryBreadcrumbs(category: string): BreadcrumbItem[] {
  return [
    {
      label: 'Explore',
      href: '/explore',
    },
    {
      label: formatCategoryName(category),
    },
  ];
}

/**
 * Utility function to generate breadcrumb items for an architect page
 */
export function getArchitectBreadcrumbs(architectName: string): BreadcrumbItem[] {
  return [
    {
      label: 'Architects',
      href: '/architects',
    },
    {
      label: architectName,
    },
  ];
}

/**
 * Utility function to generate breadcrumb items for a collection page
 */
export function getCollectionBreadcrumbs(
  collectionName: string,
  ownerName?: string
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];

  if (ownerName) {
    items.push({
      label: ownerName,
      href: `/user/${ownerName.toLowerCase().replace(/\s+/g, '-')}`,
    });
  }

  items.push({
    label: collectionName,
  });

  return items;
}

/**
 * Utility function to generate breadcrumb items for a trip page
 */
export function getTripBreadcrumbs(tripName: string): BreadcrumbItem[] {
  return [
    {
      label: 'Trips',
      href: '/trips',
    },
    {
      label: tripName,
    },
  ];
}

// Helper functions
function formatCityName(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatCategoryName(category: string): string {
  // Handle plural forms
  const categoryMap: Record<string, string> = {
    restaurant: 'Restaurants',
    cafe: 'Cafes',
    bar: 'Bars',
    hotel: 'Hotels',
    museum: 'Museums',
    gallery: 'Galleries',
    shop: 'Shops',
  };

  return categoryMap[category.toLowerCase()] ||
    category.charAt(0).toUpperCase() + category.slice(1) + 's';
}

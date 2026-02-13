'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  Layers,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', value: 'overview', icon: LayoutDashboard },
  { href: '/admin/destinations', label: 'CMS', value: 'cms', icon: Layers },
  { href: '/admin/analytics', label: 'Analytics', value: 'analytics', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', value: 'users', icon: Users },
  { href: '/admin/settings', label: 'Settings', value: 'settings', icon: Settings },
];

// CMS routes that should highlight the "CMS" tab
const CMS_ROUTES = [
  '/admin/destinations', '/admin/cities', '/admin/countries',
  '/admin/neighborhoods', '/admin/brands', '/admin/architects', '/admin/categories',
];

function getActiveValue(pathname: string) {
  if (pathname === '/admin') return 'overview';
  // Any CMS route highlights the CMS tab
  if (CMS_ROUTES.some(route => pathname.startsWith(route))) return 'cms';
  const match = NAV_LINKS.find(link => link.href !== '/admin' && pathname.startsWith(link.href));
  return match?.value || 'overview';
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeValue = getActiveValue(pathname || '');
  const activeLink = NAV_LINKS.find(l => l.value === activeValue);

  const handleNavigation = (href: string) => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Navigation */}
      <div className="sm:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center justify-between w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-900 dark:text-white"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle admin navigation"
        >
          <span className="flex items-center gap-2">
            {activeLink && <activeLink.icon className="w-4 h-4" />}
            {activeLink?.label || 'Navigation'}
          </span>
          {mobileMenuOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <Menu className="w-4 h-4" />
          )}
        </button>

        {mobileMenuOpen && (
          <div className="mt-2 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg max-h-[60vh] overflow-y-auto">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = activeValue === link.value;
              return (
                <button
                  key={link.value}
                  onClick={() => handleNavigation(link.href)}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-900/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Navigation - Minimal text tabs matching account page */}
      <div className="hidden sm:block">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {NAV_LINKS.map((link) => {
            const isActive = activeValue === link.value;
            return (
              <button
                key={link.value}
                onClick={() => handleNavigation(link.href)}
                className={`transition-all ${
                  isActive
                    ? 'font-medium text-black dark:text-white'
                    : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

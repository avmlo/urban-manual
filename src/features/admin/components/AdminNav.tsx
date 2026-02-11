'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  LayoutDashboard,
  BarChart3,
  Sparkles,
  Users,
  Settings,
  Layers,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', value: 'overview', icon: LayoutDashboard },
  { href: '/admin/destinations', label: 'CMS', value: 'cms', icon: Layers },
  { href: '/admin/analytics', label: 'Analytics', value: 'analytics', icon: BarChart3 },
  { href: '/admin/enrich', label: 'Enrich', value: 'enrich', icon: Sparkles },
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
          className="flex items-center justify-between w-full px-3 py-2 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-xl text-sm font-medium text-[var(--editorial-text-primary)]"
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
          <div className="absolute left-0 right-0 mt-1 mx-4 py-1 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-xl shadow-lg z-50 max-h-[60vh] overflow-y-auto">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = activeValue === link.value;
              return (
                <button
                  key={link.value}
                  onClick={() => handleNavigation(link.href)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'text-[var(--editorial-text-primary)] font-medium bg-[var(--editorial-border-subtle)]'
                      : 'text-[var(--editorial-text-secondary)] hover:bg-[var(--editorial-border-subtle)]'
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

      {/* Desktop Navigation - Pill tabs matching trip detail page */}
      <div className="hidden sm:flex items-center gap-0.5 rounded-full bg-[var(--editorial-border-subtle)]/60 p-0.5">
        {NAV_LINKS.map((link) => {
          const isActive = activeValue === link.value;
          return (
            <button
              key={link.value}
              onClick={() => handleNavigation(link.href)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)]'
                  : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] hover:bg-[var(--editorial-border-subtle)]'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

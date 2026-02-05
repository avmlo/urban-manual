'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { openCookieSettings } from '@/components/CookieConsent';
import { ThemeToggle } from '@/components/ThemeToggle';

const sitemapSections = [
  {
    title: 'Most Common Pages',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Explore', href: '/explore' },
      { label: 'Cities', href: '/cities' },
    ],
  },
  {
    title: 'Discover',
    links: [
      { label: 'All Cities', href: '/cities' },
      { label: 'Restaurants', href: '/category/restaurant' },
      { label: 'Hotels', href: '/category/hotel' },
      { label: 'Cafes', href: '/category/cafe' },
      { label: 'Bars', href: '/category/bar' },
    ],
  },
  {
    title: 'Features',
    links: [
      { label: 'My Trips', href: '/trips' },
      { label: 'My Collections', href: '/account?tab=collections' },
      { label: 'Saved Places', href: '/account?tab=saved' },
      { label: 'Visited Places', href: '/account?tab=visited' },
      { label: 'Activity Feed', href: '/feed' },
    ],
  },
  {
    title: 'Account & Settings',
    links: [
      { label: 'My Account', href: '/account' },
      { label: 'Settings', href: '/account?tab=settings' },
      { label: 'Profile', href: '/profile' },
    ],
  },
  {
    title: 'Information',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Newsletter', href: '/newsletter' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
];

export function Footer() {
  const [isSitemapExpanded, setIsSitemapExpanded] = useState(false);

  return (
    <footer className="mt-20 border-t border-[var(--editorial-border)] relative" role="contentinfo">
      {/* Lovably-style clean footer */}
      <div className="w-full px-6 md:px-10 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--editorial-text-secondary)]">
          {/* Copyright */}
          <div className="flex items-center">
            <span>© {new Date().getFullYear()} The Manual Company. All Rights Reserved.</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center justify-start md:justify-center gap-6">
            <Link href="/newsletter" className="hover:text-[var(--editorial-text-primary)] transition-opacity hover:opacity-70">
              Newsletter
            </Link>
            <Link href="/about" className="hover:text-[var(--editorial-text-primary)] transition-opacity hover:opacity-70">
              About
            </Link>
            <Link href="/contact" className="hover:text-[var(--editorial-text-primary)] transition-opacity hover:opacity-70">
              Contact
            </Link>
            <button
              onClick={() => setIsSitemapExpanded(!isSitemapExpanded)}
              className="flex items-center gap-1 hover:text-[var(--editorial-text-primary)] transition-opacity hover:opacity-70"
              aria-expanded={isSitemapExpanded}
              aria-controls="footer-sitemap"
            >
              Sitemap
              {isSitemapExpanded ? (
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Right section */}
          <div className="flex items-center justify-start md:justify-end gap-6">
            <ThemeToggle />
            <button
              onClick={openCookieSettings}
              className="hover:text-[var(--editorial-text-primary)] transition-opacity hover:opacity-70"
            >
              Cookies
            </button>
            <Link href="/privacy" className="hover:text-[var(--editorial-text-primary)] transition-opacity hover:opacity-70">
              Privacy
            </Link>
          </div>
        </div>
      </div>

      {/* Expandable Sitemap - Lovably-style clean grid */}
      {isSitemapExpanded && (
        <div id="footer-sitemap" className="w-full px-6 md:px-10 py-6 border-t border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {sitemapSections.map((section, index) => (
                <div key={index}>
                  <h2 className="text-xs font-medium text-[var(--editorial-text-primary)] mb-3">
                    {section.title}
                  </h2>
                  <nav className="space-y-2">
                    {section.links.map((link, linkIndex) => (
                      <Link
                        key={linkIndex}
                        href={link.href}
                        className="block text-xs text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-opacity hover:opacity-70"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

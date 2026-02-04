'use client';

import { useState, useCallback, useRef } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageData } from './HomepageDataProvider';

const FEATURED_CITIES = ['Taipei', 'Tokyo', 'New York', 'London'];

/**
 * Interactive Hero Component
 *
 * Clean hero with search bar and navigation links.
 * City/category links navigate to dedicated pages.
 * Search submits to AI chat.
 */
export default function InteractiveHero() {
  const { user } = useAuth();
  const {
    destinations,
    cities,
    categories,
    openAIChat,
  } = useHomepageData();

  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const userName =
    user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const destinationCount = destinations.length || '800';

  const featuredCities = FEATURED_CITIES.filter((c) =>
    cities.some((city) => city.toLowerCase() === c.toLowerCase())
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const query = searchValue.trim();
      if (!query) return;
      openAIChat(query);
      setSearchValue('');
    },
    [searchValue, openAIChat]
  );

  return (
    <div className="w-full pr-6 md:pr-10">
      <div className="flex flex-col justify-center max-w-xl">
        {/* Headline */}
        <h2
          className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] leading-[1.05] font-normal tracking-[-0.02em] text-[var(--editorial-text-primary)] mb-4"
          style={{
            fontFamily:
              "'Source Serif 4', Georgia, 'Times New Roman', serif",
          }}
        >
          {userName
            ? `${getGreeting()}, ${userName}`
            : "Discover the world's finest"}
        </h2>

        {/* Subheadline */}
        <p
          className="text-sm md:text-base text-[var(--editorial-text-secondary)] mb-10 leading-relaxed max-w-md"
          style={{
            fontFamily:
              "'Source Serif 4', Georgia, 'Times New Roman', serif",
          }}
        >
          {destinationCount}+ handpicked destinations across the globe.
        </p>

        {/* Search */}
        <form onSubmit={handleSubmit}>
          <div className="relative max-w-md">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="w-4 h-4 text-[var(--editorial-text-tertiary)]" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search destinations..."
              className="w-full h-12 pl-11 pr-14 text-sm bg-[var(--editorial-bg-elevated)] rounded-lg
                         border border-[var(--editorial-border)] text-[var(--editorial-text-primary)]
                         placeholder:text-[var(--editorial-text-tertiary)]
                         focus:outline-none focus:border-[var(--editorial-text-primary)]"
            />
            <button
              type="submit"
              disabled={!searchValue.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                         rounded-md bg-[var(--editorial-text-primary)] text-[var(--editorial-bg)]
                         disabled:opacity-30"
              aria-label="Search"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Navigation Links */}
      <nav className="pt-12 lg:pt-16 flex flex-col gap-4">
        {/* Cities */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {featuredCities.map((city) => (
            <Link
              key={city}
              href={`/city/${encodeURIComponent(city.toLowerCase())}`}
              className="text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)]"
            >
              {capitalizeCity(city)}
            </Link>
          ))}
          <Link
            href="/cities"
            className="text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)]"
          >
            All cities
          </Link>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {categories.slice(0, 6).map((category) => (
            <Link
              key={category}
              href={`/category/${encodeURIComponent(category.toLowerCase())}`}
              className="text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)]"
            >
              {capitalizeCategory(category)}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

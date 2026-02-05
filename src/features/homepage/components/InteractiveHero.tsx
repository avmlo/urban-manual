'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageData } from './HomepageDataProvider';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';

const FEATURED_CITIES = ['Taipei', 'Tokyo', 'New York', 'London'];

/**
 * Interactive Hero Component
 *
 * Clean hero with search bar and filter links.
 * Search filters the grid as you type; Enter opens AI chat.
 * City/category links filter inline and also link to dedicated pages.
 */
export default function InteractiveHero() {
  const { user } = useAuth();
  const {
    destinations,
    cities,
    categories,
    selectedCity,
    selectedCategory,
    setSelectedCity,
    setSelectedCategory,
    setSearchTerm,
    michelinOnly,
    setMichelinOnly,
    openAIChat,
  } = useHomepageData();

  const [localSearchTerm, setLocalSearchTerm] = useState('');
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

  // Keyboard shortcut: Press '/' to focus search
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Update grid filter as user types
  useEffect(() => {
    setSearchTerm(localSearchTerm);
  }, [localSearchTerm, setSearchTerm]);

  // Handle form submit: open AI chat with the query
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const query = localSearchTerm.trim();
      if (!query) return;
      openAIChat(query);
      setLocalSearchTerm('');
      setSearchTerm('');
    },
    [localSearchTerm, openAIChat, setSearchTerm]
  );

  const handleCityClick = useCallback(
    (city: string) => {
      setSelectedCity(
        city.toLowerCase() === selectedCity.toLowerCase() ? '' : city
      );
    },
    [selectedCity, setSelectedCity]
  );

  const handleCategoryClick = useCallback(
    (category: string) => {
      setSelectedCategory(
        category.toLowerCase() === selectedCategory.toLowerCase()
          ? ''
          : category
      );
    },
    [selectedCategory, setSelectedCategory]
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
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              placeholder="Search destinations..."
              className="w-full h-12 pl-11 pr-14 text-sm bg-[var(--editorial-bg-elevated)] rounded-lg
                         border border-[var(--editorial-border)] text-[var(--editorial-text-primary)]
                         placeholder:text-[var(--editorial-text-tertiary)]
                         focus:outline-none focus:border-[var(--editorial-text-primary)]"
            />
            <button
              type="submit"
              disabled={!localSearchTerm.trim()}
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

      {/* City & Category Filters */}
      <div className="pt-12 lg:pt-16 flex flex-col gap-4">
        {/* Cities */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <button
            onClick={() => setSelectedCity('')}
            className={`${!selectedCity ? 'text-[var(--editorial-text-primary)]' : 'text-[var(--editorial-text-tertiary)]'}`}
          >
            All Cities
          </button>
          {featuredCities.map((city) => (
            <button
              key={city}
              onClick={() => handleCityClick(city)}
              className={`${
                selectedCity.toLowerCase() === city.toLowerCase()
                  ? 'text-[var(--editorial-text-primary)]'
                  : 'text-[var(--editorial-text-tertiary)]'
              }`}
            >
              {capitalizeCity(city)}
            </button>
          ))}
          <Link
            href="/cities"
            className="text-[var(--editorial-text-tertiary)]"
          >
            More &rarr;
          </Link>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <button
              onClick={() => {
                setSelectedCategory('');
                setMichelinOnly(false);
              }}
              className={`${!selectedCategory && !michelinOnly ? 'text-[var(--editorial-text-primary)]' : 'text-[var(--editorial-text-tertiary)]'}`}
            >
              All
            </button>
            <button
              onClick={() => setMichelinOnly(!michelinOnly)}
              className={`${michelinOnly ? 'text-[var(--editorial-text-primary)]' : 'text-[var(--editorial-text-tertiary)]'}`}
            >
              Michelin
            </button>
            {categories.slice(0, 8).map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`${
                  selectedCategory.toLowerCase() === category.toLowerCase()
                    ? 'text-[var(--editorial-text-primary)]'
                    : 'text-[var(--editorial-text-tertiary)]'
                }`}
              >
                {capitalizeCategory(category)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

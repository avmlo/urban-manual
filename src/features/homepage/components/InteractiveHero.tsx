'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useHomepageData } from './HomepageDataProvider';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';

const FEATURED_CITIES = ['Taipei', 'Tokyo', 'New York', 'London'];

/**
 * Interactive Hero Component
 *
 * Clean, minimal hero with search and filter links.
 * Search input filters the grid; pressing Enter with a query opens the AI chat.
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

  // Get user's first name for greeting
  const userName =
    user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0];

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const destinationCount = destinations.length || '800';

  // Featured cities that exist in our data
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

  // Handle city filter
  const handleCityClick = useCallback(
    (city: string) => {
      if (city.toLowerCase() === selectedCity.toLowerCase()) {
        setSelectedCity('');
      } else {
        setSelectedCity(city);
      }
    },
    [selectedCity, setSelectedCity]
  );

  // Handle category filter
  const handleCategoryClick = useCallback(
    (category: string) => {
      if (category.toLowerCase() === selectedCategory.toLowerCase()) {
        setSelectedCategory('');
      } else {
        setSelectedCategory(category);
      }
    },
    [selectedCategory, setSelectedCategory]
  );

  return (
    <div className="w-full pr-6 md:pr-10">
      {/* Left Column - Editorial Text */}
      <div className="flex flex-col justify-center max-w-xl">
        {/* Small Caps Label */}
        <p className="text-xs uppercase tracking-widest text-[var(--editorial-text-tertiary)] mb-6">
          Curated Travel Guide
        </p>

        {/* Main Headline */}
        <h2
          className="text-[2.5rem] md:text-[3.5rem] lg:text-[4rem] leading-[1.05] font-normal tracking-[-0.02em] text-[var(--editorial-text-primary)] mb-6"
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
          {destinationCount}+ handpicked hotels, restaurants, and destinations
          across the globe.
        </p>

        {/* Search Input */}
        <form onSubmit={handleSubmit} className="mb-0">
          <div className="relative max-w-md">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
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
                         focus:outline-none focus:border-[var(--editorial-text-primary)]
                         transition-all duration-200"
            />
            <button
              type="submit"
              disabled={!localSearchTerm.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                         rounded-md bg-[var(--editorial-text-primary)]
                         text-[var(--editorial-bg)]
                         hover:opacity-90 active:opacity-80
                         disabled:opacity-30 transition-all duration-200 z-10"
              aria-label="AI Search"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--editorial-text-tertiary)]">
            Type to filter &middot; press Enter for AI search
          </p>
        </form>
      </div>

      {/* City & Category Filters */}
      <div className="pt-12 lg:pt-16">
        <div className="w-full">
          {/* City Filters */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {selectedCity ? (
                <>
                  <button
                    onClick={() => handleCityClick(selectedCity)}
                    className="text-xs font-medium text-[var(--editorial-text-primary)] transition-colors duration-200"
                  >
                    {capitalizeCity(selectedCity)}
                  </button>
                  <button
                    onClick={() => setSelectedCity('')}
                    className="text-xs font-medium text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors duration-200"
                  >
                    Show all cities
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedCity('')}
                    className="text-xs font-medium text-[var(--editorial-text-primary)] transition-colors duration-200"
                  >
                    All Cities
                  </button>
                  {featuredCities.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleCityClick(city)}
                      className="text-xs font-medium text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors duration-200"
                    >
                      {capitalizeCity(city)}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Category Filters */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {selectedCategory || michelinOnly ? (
                <>
                  {selectedCategory && (
                    <button
                      onClick={() => handleCategoryClick(selectedCategory)}
                      className="flex items-center gap-1.5 font-medium text-[var(--editorial-text-primary)] transition-colors duration-200"
                    >
                      {(() => {
                        const IconComponent =
                          getCategoryIconComponent(selectedCategory);
                        return IconComponent ? (
                          <IconComponent className="w-4 h-4" />
                        ) : null;
                      })()}
                      {capitalizeCategory(selectedCategory)}
                    </button>
                  )}
                  {michelinOnly && (
                    <button
                      onClick={() => setMichelinOnly(!michelinOnly)}
                      className="flex items-center gap-1.5 font-medium text-[var(--editorial-text-primary)] transition-colors duration-200"
                    >
                      <img
                        src="/michelin-star.svg"
                        alt="Michelin"
                        className="w-4 h-4"
                      />
                      Michelin
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setMichelinOnly(false);
                    }}
                    className="font-medium text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors duration-200"
                  >
                    Show all categories
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setMichelinOnly(false);
                    }}
                    className="font-medium text-[var(--editorial-text-primary)] transition-colors duration-200"
                  >
                    All Categories
                  </button>
                  <button
                    onClick={() => setMichelinOnly(!michelinOnly)}
                    className="flex items-center gap-1.5 font-medium text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors duration-200"
                  >
                    <img
                      src="/michelin-star.svg"
                      alt="Michelin"
                      className="w-4 h-4"
                    />
                    Michelin
                  </button>
                  {categories.slice(0, 8).map((category) => {
                    const IconComponent = getCategoryIconComponent(category);
                    return (
                      <button
                        key={category}
                        onClick={() => handleCategoryClick(category)}
                        className="flex items-center gap-1.5 font-medium text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors duration-200"
                      >
                        {IconComponent && (
                          <IconComponent className="w-4 h-4" />
                        )}
                        {capitalizeCategory(category)}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

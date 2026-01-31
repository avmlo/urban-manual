'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { capitalizeCategory, capitalizeCity } from '@/lib/utils';
import { useHomepageData } from './HomepageDataProvider';

/**
 * Index Hero Component - DS+R-inspired minimal design
 *
 * Centered search bar with two-column city + category filter grid.
 * Clean, architectural aesthetic with monospace typography.
 */
export default function IndexHero() {
  const {
    cities,
    selectedCity,
    setSelectedCity,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchTerm,
    setSearchTerm,
  } = useHomepageData();

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync local search with context (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localSearchTerm, setSearchTerm]);

  // Keyboard shortcut: '/' to focus search
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

  const handleCategoryClick = useCallback(
    (category: string) => {
      if (selectedCategory === category) {
        setSelectedCategory('');
      } else {
        setSelectedCategory(category);
      }
    },
    [selectedCategory, setSelectedCategory]
  );

  const handleCityClick = useCallback(
    (city: string) => {
      if (selectedCity === city) {
        setSelectedCity('');
      } else {
        setSelectedCity(city);
      }
    },
    [selectedCity, setSelectedCity]
  );

  return (
    <div className="flex flex-col items-center justify-center w-full py-16 md:py-24 lg:py-32">
      {/* Search Bar */}
      <div className="w-full max-w-xl px-6">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full px-5 py-4 text-base font-mono
                       border border-[var(--editorial-text-primary)]
                       bg-transparent
                       text-[var(--editorial-text-primary)]
                       placeholder:text-[var(--editorial-text-tertiary)]
                       focus:outline-none
                       transition-colors duration-200"
          />
        </div>
      </div>

      {/* Filter Grid - Cities (left) + Categories (right) */}
      <div className="mt-10 md:mt-14 px-6">
        <div className="flex gap-12 md:gap-20 lg:gap-28">
          {/* Left Column - Cities */}
          <div className="flex flex-col gap-2">
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => handleCityClick(city)}
                className={`text-left text-xs md:text-sm tracking-[0.15em] uppercase font-mono
                           transition-all duration-200 py-0.5
                           ${
                             selectedCity === city
                               ? 'text-[var(--editorial-text-primary)] font-medium'
                               : 'text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)]'
                           }`}
              >
                {capitalizeCity(city)}
              </button>
            ))}
          </div>

          {/* Right Column - Categories */}
          <div className="flex flex-col gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`text-left text-xs md:text-sm tracking-[0.15em] uppercase font-mono
                           transition-all duration-200 py-0.5
                           ${
                             selectedCategory === category
                               ? 'text-[var(--editorial-text-primary)] font-medium'
                               : 'text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)]'
                           }`}
              >
                {capitalizeCategory(category)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

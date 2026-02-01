'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { capitalizeCategory, capitalizeCity } from '@/lib/utils';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';
import { useHomepageData } from './HomepageDataProvider';

const VISIBLE_CITIES_COUNT = 3;

/**
 * Index Hero Component - DS+R-inspired minimal design
 *
 * Centered search bar with inline city + category filter rows below.
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
    michelinOnly,
    setMichelinOnly,
  } = useHomepageData();

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [showAllCities, setShowAllCities] = useState(false);
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
      setSelectedCategory(selectedCategory === category ? '' : category);
    },
    [selectedCategory, setSelectedCategory]
  );

  const handleCityClick = useCallback(
    (city: string) => {
      setSelectedCity(selectedCity === city ? '' : city);
    },
    [selectedCity, setSelectedCity]
  );

  const displayedCities = useMemo(
    () => (showAllCities ? cities : cities.slice(0, VISIBLE_CITIES_COUNT)),
    [cities, showAllCities]
  );
  const remainingCitiesCount = cities.length - VISIBLE_CITIES_COUNT;

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

      {/* Cities Row */}
      <div className="mt-10 md:mt-14 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-6">
        <button
          onClick={() => { setSelectedCity(''); setShowAllCities(false); }}
          className={`text-sm transition-colors duration-200
                     ${!selectedCity
                       ? 'text-[var(--editorial-text-primary)] font-semibold'
                       : 'text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)]'
                     }`}
        >
          All Cities
        </button>
        {displayedCities.map((city) => (
          <button
            key={city}
            onClick={() => handleCityClick(city)}
            className={`text-sm transition-colors duration-200
                       ${selectedCity === city
                         ? 'text-[var(--editorial-text-primary)] font-semibold'
                         : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)]'
                       }`}
          >
            {capitalizeCity(city)}
          </button>
        ))}
        {!showAllCities && remainingCitiesCount > 0 && (
          <button
            onClick={() => setShowAllCities(true)}
            className="text-sm text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors duration-200"
          >
            +{remainingCitiesCount} more
          </button>
        )}
      </div>

      {/* Categories Row */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-6">
        <button
          onClick={() => { setSelectedCategory(''); setMichelinOnly(false); }}
          className={`text-sm transition-colors duration-200
                     ${!selectedCategory && !michelinOnly
                       ? 'text-[var(--editorial-text-primary)] font-semibold'
                       : 'text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)]'
                     }`}
        >
          All Categories
        </button>
        <button
          onClick={() => setMichelinOnly(!michelinOnly)}
          className={`text-sm flex items-center gap-1.5 transition-colors duration-200
                     ${michelinOnly
                       ? 'text-red-600 font-semibold'
                       : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)]'
                     }`}
        >
          <img src="/michelin-star.svg" alt="" className="h-4 w-4" />
          Michelin
        </button>
        {categories.map((category) => {
          const IconComponent = getCategoryIconComponent(category);
          return (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`text-sm flex items-center gap-1.5 transition-colors duration-200
                         ${selectedCategory === category
                           ? 'text-[var(--editorial-text-primary)] font-semibold'
                           : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)]'
                         }`}
            >
              {IconComponent && (
                <IconComponent
                  size={16}
                  className={selectedCategory === category
                    ? 'text-[var(--editorial-text-primary)]'
                    : 'text-[var(--editorial-text-tertiary)]'
                  }
                />
              )}
              {capitalizeCategory(category)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

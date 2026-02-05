"use client";

import { useCallback } from "react";

interface HeroSectionProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

export function HeroSection({ onSearch, searchQuery }: HeroSectionProps) {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearch(e.target.value);
    },
    [onSearch]
  );

  return (
    <section className="min-h-[60vh] flex flex-col justify-center px-10 md:px-12 py-16 bg-[var(--editorial-bg)]">
      {/* Headline */}
      <div className="max-w-4xl mb-12">
        <h1 className="text-[clamp(2.5rem,8vw,5rem)] font-normal leading-[1.1] tracking-[-0.02em] text-[var(--editorial-text-primary)]">
          <span>Travel, </span>
          <span className="text-[var(--editorial-text-secondary)]">curated.</span>
        </h1>
      </div>

      {/* Description */}
      <div className="max-w-lg mb-12">
        <p className="text-[15px] leading-relaxed text-[var(--editorial-text-secondary)]">
          Urban Manual is a curated collection of the world's finest destinations.
          Hotels, restaurants, and experiences selected with precision.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Search destinations..."
            className="w-full bg-transparent border-b border-[var(--editorial-border)] py-3 text-[15px] text-[var(--editorial-text-primary)] placeholder:text-[var(--editorial-text-tertiary)] focus:outline-none focus:border-[var(--editorial-text-primary)] transition-colors duration-300"
            aria-label="Search destinations"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearch("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors duration-200"
              aria-label="Clear search"
            >
              <span className="text-sm">Clear</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

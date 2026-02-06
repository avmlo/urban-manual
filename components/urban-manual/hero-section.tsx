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
    <section className="min-h-[70vh] flex items-center justify-end px-10 md:px-12 lg:px-24 py-16 bg-[var(--editorial-bg)]">
      <div className="w-full max-w-md">
        {/* Headline */}
        <h1 className="text-[15px] font-semibold tracking-wide text-[var(--editorial-text-primary)] mb-8">
          TRAVEL, CURATED.
        </h1>

        {/* Description */}
        <p className="text-[15px] leading-relaxed text-[var(--editorial-text-secondary)] mb-10">
          Urban Manual is an independent travel guide, discovering extraordinary destinations with care and precision.
        </p>

        {/* Search */}
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

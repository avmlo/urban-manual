"use client";

import { useState, useMemo, useCallback } from "react";
import { Header } from "@/components/urban-manual/header";
import { HeroSection } from "@/components/urban-manual/hero-section";
import { DestinationGrid } from "@/components/urban-manual/destination-grid";
import { Destination } from "@/types/destination";
import { useDrawer } from "@/contexts/DrawerContext";

const ITEMS_PER_PAGE = 12;

interface HomepageProps {
  destinations: Destination[];
}

export function Homepage({ destinations }: HomepageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { openDrawer } = useDrawer();

  // Filter destinations by search query
  const filteredDestinations = useMemo(() => {
    if (!searchQuery.trim()) return destinations;

    const query = searchQuery.toLowerCase();
    return destinations.filter(
      (destination) =>
        destination.name.toLowerCase().includes(query) ||
        destination.city.toLowerCase().includes(query) ||
        destination.category.toLowerCase().includes(query) ||
        (destination.micro_description?.toLowerCase().includes(query) ?? false)
    );
  }, [searchQuery, destinations]);

  // Get first page of results
  const displayedDestinations = useMemo(() => {
    return filteredDestinations.slice(0, ITEMS_PER_PAGE);
  }, [filteredDestinations]);

  // Handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleDestinationClick = useCallback(
    (destination: Destination) => {
      openDrawer("destination", { slug: destination.slug });
    },
    [openDrawer]
  );

  return (
    <div className="min-h-screen bg-[var(--editorial-bg)]">
      <Header />

      <main>
        <HeroSection onSearch={handleSearch} searchQuery={searchQuery} />

        {/* Destinations Grid */}
        <section className="relative pb-24 bg-[var(--editorial-bg)]">
          <DestinationGrid
            destinations={displayedDestinations}
            onDestinationClick={handleDestinationClick}
          />

          {/* Load more indicator */}
          {filteredDestinations.length > ITEMS_PER_PAGE && (
            <div className="px-10 md:px-12 pt-16 pb-8">
              <button
                type="button"
                className="text-[15px] text-[var(--editorial-text-secondary)] transition-opacity duration-200 hover:opacity-50"
              >
                View all {filteredDestinations.length} destinations
              </button>
            </div>
          )}

          {/* No results */}
          {filteredDestinations.length === 0 && searchQuery && (
            <div className="px-10 md:px-12 py-16">
              <p className="text-[15px] text-[var(--editorial-text-secondary)]">
                No destinations found for "{searchQuery}"
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="px-10 py-16 md:px-12 bg-[var(--editorial-bg)] border-t border-[var(--editorial-border)]">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-[15px] text-[var(--editorial-text-primary)]">
              Urban Manual
              <sup className="text-[10px] ml-0.5 text-[var(--editorial-text-tertiary)]">
                ®
              </sup>
            </span>
          </div>
          <nav
            className="flex items-center gap-8"
            aria-label="Footer navigation"
          >
            <a
              href="https://instagram.com/urbanmanual"
              className="text-[15px] text-[var(--editorial-text-secondary)] transition-opacity duration-200 hover:opacity-50"
            >
              Instagram
            </a>
            <a
              href="https://twitter.com/urbanmanual"
              className="text-[15px] text-[var(--editorial-text-secondary)] transition-opacity duration-200 hover:opacity-50"
            >
              Twitter
            </a>
            <a
              href="/contact"
              className="text-[15px] text-[var(--editorial-text-secondary)] transition-opacity duration-200 hover:opacity-50"
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

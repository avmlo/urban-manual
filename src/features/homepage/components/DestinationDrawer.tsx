'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, MapPin, ExternalLink, Star, Heart, Share2, Navigation, Clock, Phone, Globe, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Destination } from '@/types/destination';
import { useHomepageData } from './HomepageDataProvider';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

/**
 * Destination Drawer - Portal Design System
 *
 * A slide-over drawer for viewing destination details.
 * Dark theme with structured sections for contact, architecture, and map.
 */

export function DestinationDrawer() {
  const { selectedDestination, isDrawerOpen, closeDrawer, openDestination, filteredDestinations } = useHomepageData();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isDrawerOpen, closeDrawer]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  // Handle share
  const handleShare = async () => {
    if (!selectedDestination) return;
    const url = `${window.location.origin}/destination/${selectedDestination.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedDestination.name,
          text: selectedDestination.micro_description || `Check out ${selectedDestination.name}`,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
    }
  };

  // Handle directions
  const handleDirections = () => {
    if (!selectedDestination?.latitude || !selectedDestination?.longitude) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedDestination.latitude},${selectedDestination.longitude}`;
    window.open(url, '_blank');
  };

  // Get related destinations (same city, different destination)
  const relatedDestinations = filteredDestinations
    .filter(d => d.city === selectedDestination?.city && d.slug !== selectedDestination?.slug)
    .slice(0, 4);

  if (!selectedDestination) return null;

  const imageUrl = selectedDestination.image || selectedDestination.image_thumbnail;
  const cityName = selectedDestination.city ? capitalizeCity(selectedDestination.city) : '';
  const categoryName = selectedDestination.category ? capitalizeCategory(selectedDestination.category) : '';

  // Architecture data
  const architect = selectedDestination.design_firm || null;
  const designStyle = selectedDestination.architectural_style || null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-[#1c1c1e]
                    shadow-2xl transform transition-transform duration-300 ease-out
                    ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Scroll container */}
        <div className="h-full overflow-y-auto overscroll-contain">
          {/* Header Image with overlay content */}
          <div className="relative aspect-[4/3] bg-gray-800">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={selectedDestination.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-16 h-16 text-gray-600" />
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Close button */}
            <button
              onClick={closeDrawer}
              className="absolute top-4 right-4 w-10 h-10 rounded-lg
                         bg-black/40 backdrop-blur-md
                         flex items-center justify-center
                         hover:bg-black/60 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Save button on image */}
            <button
              onClick={() => setIsSaved(!isSaved)}
              className="absolute top-4 right-16 w-10 h-10 rounded-lg
                         bg-black/40 backdrop-blur-md
                         flex items-center justify-center
                         hover:bg-black/60 transition-colors"
            >
              <Heart className={`w-5 h-5 text-white ${isSaved ? 'fill-white' : ''}`} />
            </button>

            {/* Title overlay on image */}
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-2xl font-semibold text-white tracking-tight mb-1">
                {selectedDestination.name}
              </h2>
              <p className="text-sm text-white/70">
                {categoryName}{categoryName && cityName && ' · '}{cityName}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Rating */}
            {selectedDestination.rating && (
              <div className="flex items-center gap-2 mb-5">
                <img src="/google-logo.svg" alt="Google" className="w-5 h-5" />
                <span className="text-base font-semibold text-white">
                  {selectedDestination.rating.toFixed(1)}
                </span>
                {selectedDestination.user_ratings_total && (
                  <span className="text-sm text-gray-400">
                    ({selectedDestination.user_ratings_total} reviews)
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`flex-1 h-12 rounded-xl text-sm font-medium
                            flex items-center justify-center gap-2 transition-all
                            ${isSaved
                              ? 'bg-white text-gray-900'
                              : 'bg-[#2c2c2e] text-white hover:bg-[#3c3c3e]'
                            }`}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                Save
              </button>
              <button
                onClick={handleShare}
                className="w-12 h-12 rounded-xl bg-[#2c2c2e]
                           flex items-center justify-center
                           hover:bg-[#3c3c3e] transition-colors"
              >
                <Share2 className="w-5 h-5 text-white" />
              </button>
              {(selectedDestination.latitude && selectedDestination.longitude) && (
                <button
                  onClick={handleDirections}
                  className="w-12 h-12 rounded-xl bg-[#2c2c2e]
                             flex items-center justify-center
                             hover:bg-[#3c3c3e] transition-colors"
                >
                  <Navigation className="w-5 h-5 text-white" />
                </button>
              )}
            </div>

            {/* Description */}
            {(selectedDestination.micro_description || selectedDestination.description) && (
              <div className="mb-6">
                <p className="text-sm leading-relaxed text-gray-300">
                  {selectedDestination.micro_description || selectedDestination.description}
                </p>
              </div>
            )}

            {/* Contact & Hours Section */}
            {(selectedDestination.formatted_address || selectedDestination.phone_number || selectedDestination.website) && (
              <div className="mb-6">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Contact & Hours
                </h3>
                <div className="space-y-3">
                  {/* Address */}
                  {selectedDestination.formatted_address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-white">
                        {selectedDestination.formatted_address}
                      </span>
                    </div>
                  )}

                  {/* Phone */}
                  {selectedDestination.phone_number && (
                    <a
                      href={`tel:${selectedDestination.phone_number}`}
                      className="flex items-center gap-3 group"
                    >
                      <Phone className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-white group-hover:text-gray-300 transition-colors">
                        {selectedDestination.phone_number}
                      </span>
                    </a>
                  )}

                  {/* Website */}
                  {selectedDestination.website && (
                    <a
                      href={selectedDestination.website.startsWith('http') ? selectedDestination.website : `https://${selectedDestination.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group"
                    >
                      <Globe className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-cyan-400 group-hover:text-cyan-300 transition-colors">
                        {selectedDestination.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Design & Architecture Section */}
            {(architect || designStyle) && (
              <div className="mb-6">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Design & Architecture
                </h3>
                <div className="space-y-4">
                  {/* Architect */}
                  {architect && (
                    <div className="flex items-center gap-3 py-3 border-b border-white/10">
                      <div className="w-10 h-10 rounded-lg bg-[#2c2c2e] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-gray-400">A</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Architect
                        </p>
                        <p className="text-sm text-white">
                          {architect}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Style */}
                  {designStyle && (
                    <div className="flex items-center gap-3 py-3 border-b border-white/10">
                      <div className="w-10 h-10 rounded-lg bg-[#2c2c2e] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-gray-400">S</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Style
                        </p>
                        <p className="text-sm text-white">
                          {designStyle}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map Preview */}
            {(selectedDestination.latitude && selectedDestination.longitude) && (
              <div className="mb-6">
                <div className="bg-[#2c2c2e] rounded-lg p-6">
                  <div className="flex flex-col items-center justify-center py-8">
                    <MapPin className="w-8 h-8 text-gray-500 mb-2" />
                    <span className="text-sm text-gray-400">Map Preview</span>
                  </div>
                  <button
                    onClick={handleDirections}
                    className="w-full py-3 px-4 bg-[#3c3c3e] rounded-xl text-sm font-medium text-white
                               hover:bg-[#4c4c4e] transition-colors"
                  >
                    View larger map
                  </button>
                </div>
              </div>
            )}

            {/* View Full Details Button */}
            <Link
              href={`/destination/${selectedDestination.slug}`}
              className="flex items-center justify-center gap-2 w-full py-4 px-6
                         bg-white rounded-lg
                         hover:bg-gray-100 transition-colors"
            >
              <span className="text-base font-semibold text-gray-900">
                View Full Details
              </span>
              <ArrowUpRight className="w-5 h-5 text-gray-900" />
            </Link>

            {/* Related Destinations */}
            {relatedDestinations.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                  More in {cityName}
                </h3>
                <div className="space-y-3">
                  {relatedDestinations.map((dest) => (
                    <button
                      key={dest.slug}
                      onClick={() => openDestination(dest)}
                      className="flex items-center gap-3 w-full p-2 -mx-2 rounded-xl
                                 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gray-800 overflow-hidden flex-shrink-0">
                        {(dest.image || dest.image_thumbnail) && (
                          <Image
                            src={dest.image_thumbnail || dest.image || ''}
                            alt={dest.name}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {dest.name}
                        </p>
                        <p className="text-sm text-gray-400 truncate">
                          {dest.category && capitalizeCategory(dest.category)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default DestinationDrawer;

'use client';

import { Globe, Search } from 'lucide-react';
import type { Destination } from '@/types/destination';

interface SEOPreviewProps {
  destination: Partial<Destination>;
}

export function SEOPreview({ destination }: SEOPreviewProps) {
  const metaTitle = destination.meta_title || destination.name || 'Untitled';
  const metaDescription =
    destination.meta_description || destination.micro_description || destination.description || '';
  const displayUrl = destination.website || `urbanmanual.co/places/${destination.slug}`;

  // Calculate character counts
  const titleLength = metaTitle.length;
  const descLength = metaDescription.length;

  // Determine status colors
  const titleColor =
    titleLength >= 30 && titleLength <= 60
      ? 'text-green-600'
      : titleLength > 60
        ? 'text-red-600'
        : 'text-amber-600';
  const descColor =
    descLength >= 120 && descLength <= 160
      ? 'text-green-600'
      : descLength > 160
        ? 'text-red-600'
        : descLength < 120
          ? 'text-amber-600'
          : 'text-gray-600';

  return (
    <div className="space-y-4">
      {/* Google Search Preview */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Search size={16} className="text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">Google Search Preview</h4>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
            <Globe size={14} />
            <span className="truncate">{displayUrl}</span>
          </div>

          {/* Title */}
          <h3 className="text-xl text-blue-600 hover:underline cursor-pointer mb-1 line-clamp-1">
            {metaTitle}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2">{metaDescription}</p>
        </div>
      </div>

      {/* Character Counts */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">Title Length</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  titleLength >= 30 && titleLength <= 60
                    ? 'bg-green-500'
                    : titleLength > 60
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min((titleLength / 60) * 100, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${titleColor} min-w-[60px] text-right`}>
              {titleLength}/60
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {titleLength < 30 && 'Too short. Aim for 30-60 characters.'}
            {titleLength >= 30 && titleLength <= 60 && 'Perfect length!'}
            {titleLength > 60 && 'Too long. May be truncated in search results.'}
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 block mb-1">
            Description Length
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  descLength >= 120 && descLength <= 160
                    ? 'bg-green-500'
                    : descLength > 160
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min((descLength / 160) * 100, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${descColor} min-w-[70px] text-right`}>
              {descLength}/160
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {descLength < 120 && 'Too short. Aim for 120-160 characters.'}
            {descLength >= 120 && descLength <= 160 && 'Perfect length!'}
            {descLength > 160 && 'Too long. May be truncated in search results.'}
          </p>
        </div>
      </div>

      {/* Social Media Preview */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Globe size={16} className="text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">Social Media Preview</h4>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {/* OG Image */}
          {(destination.og_image || destination.image) && (
            <div className="aspect-[1.91/1] bg-gray-100 relative overflow-hidden">
              <img
                src={destination.og_image || destination.image}
                alt={metaTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-3">
            <div className="text-xs text-gray-500 mb-1 uppercase">{displayUrl}</div>
            <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1">
              {destination.og_title || metaTitle}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {destination.og_description || metaDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Indexing Status */}
      <div className="border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Search Engine Indexing</span>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              destination.noindex
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {destination.noindex ? 'Blocked (noindex)' : 'Allowed'}
          </span>
        </div>
        {destination.noindex && (
          <p className="text-xs text-red-600 mt-2">
            This page will not appear in search engine results.
          </p>
        )}
      </div>
    </div>
  );
}

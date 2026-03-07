'use client';

import { X } from 'lucide-react';

export interface RefinementTag {
  type: 'category' | 'city' | 'neighborhood' | 'style' | 'price' | 'modifier';
  value: string;
  label: string;
}

interface RefinementChipsProps {
  tags: RefinementTag[];
  onChipClick: (tag: RefinementTag) => void;
  onChipRemove?: (tag: RefinementTag) => void;
  activeTags?: Set<string>;
  className?: string;
}

export function RefinementChips({
  tags,
  onChipClick,
  onChipRemove,
  activeTags = new Set(),
  className = '',
}: RefinementChipsProps) {
  if (tags.length === 0) {
    return null;
  }

  // Monochromatic palette for design consistency
  const getTagColor = (type: RefinementTag['type']) => {
    switch (type) {
      case 'category':
        return 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900';
      case 'city':
        return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
      case 'neighborhood':
        return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400';
      case 'style':
        return 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200';
      case 'price':
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400';
      case 'modifier':
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag, index) => {
        const isActive = activeTags.has(`${tag.type}-${tag.value}`);
        const baseClasses = `inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs font-medium transition-all cursor-pointer ${
          isActive
            ? 'ring-2 ring-black dark:ring-white'
            : 'hover:scale-105 hover:shadow-sm'
        }`;
        const colorClasses = getTagColor(tag.type);

        return (
          <button
            type="button"
            key={`${tag.type}-${tag.value}-${index}`}
            onClick={() => onChipClick(tag)}
            className={`${baseClasses} ${colorClasses}`}
            aria-label={isActive ? `Remove filter ${tag.label}` : `Filter by ${tag.label}`}
            aria-pressed={isActive}
          >
            <span>{tag.label}</span>
            {onChipRemove && (
              <X className="h-3 w-3 ml-0.5 hover:opacity-70 transition-opacity" />
            )}
          </button>
        );
      })}
    </div>
  );
}


/**
 * Movement Tag
 * Visual indicator for design movement
 */

import type { DesignMovement } from '@/types/architecture';

interface MovementTagProps {
  movement: DesignMovement | string | null | undefined;
  size?: 'sm' | 'md';
}

const movementColors: Record<string, string> = {
  brutalism: 'bg-gray-800 text-white',
  modernism: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  postmodernism: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  contemporary: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  minimalism: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
  'art-deco': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  deconstructivism: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

export function MovementTag({ movement, size = 'md' }: MovementTagProps) {
  if (!movement) return null;

  const movementName = typeof movement === 'string' ? movement : movement.name;
  const movementSlug = typeof movement === 'string' ? movement.toLowerCase().replace(/\s+/g, '-') : movement.slug;
  const colorClass = movementColors[movementSlug] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100';

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
  };

  return (
    <a
      href={`/movement/${movementSlug}`}
      className={`
        inline-block
        ${sizeClasses[size]}
        ${colorClass}
        rounded-full
        font-medium
        hover:opacity-80
        transition-opacity
      `}
    >
      {movementName}
    </a>
  );
}


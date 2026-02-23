/**
 * Material Indicators
 * Visual representation of materials used
 */

import type { Material } from '@/types/architecture';

interface MaterialIndicatorsProps {
  materials: Material[] | string[] | null | undefined;
  maxDisplay?: number;
}

const materialIcons: Record<string, string> = {
  concrete: '🏗️',
  glass: '🪟',
  steel: '⚙️',
  wood: '🪵',
  stone: '🪨',
  brick: '🧱',
  marble: '💎',
  copper: '🔶',
};

export function MaterialIndicators({ materials, maxDisplay = 3 }: MaterialIndicatorsProps) {
  if (!materials || materials.length === 0) return null;

  const materialList = materials.slice(0, maxDisplay);
  const remaining = materials.length - maxDisplay;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {materialList.map((material, index) => {
        const materialName = typeof material === 'string' ? material : material.name;
        const materialSlug = typeof material === 'string' ? material.toLowerCase() : material.slug;
        const icon = materialIcons[materialSlug] || '🏛️';

        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400"
            title={materialName}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{materialName}</span>
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="text-sm text-gray-500 dark:text-gray-500">
          +{remaining} more
        </span>
      )}
    </div>
  );
}


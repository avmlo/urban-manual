'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to calculate the number of grid columns based on current viewport width
 * Matches the responsive grid: grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7
 */
export function useGridColumns(): number {
  const [columns, setColumns] = useState(2); // Default to mobile (2 columns)

  useEffect(() => {
    const calculateColumns = () => {
      const width = window.innerWidth;
      
      if (width >= 1536) {
        // 2xl: 7 columns
        setColumns(7);
      } else if (width >= 1280) {
        // xl: 6 columns
        setColumns(6);
      } else if (width >= 1024) {
        // lg: 5 columns
        setColumns(5);
      } else if (width >= 768) {
        // md: 4 columns
        setColumns(4);
      } else if (width >= 640) {
        // sm: 3 columns
        setColumns(3);
      } else {
        // mobile: 2 columns
        setColumns(2);
      }
    };

    // Calculate on mount
    calculateColumns();

    // Recalculate on resize
    window.addEventListener('resize', calculateColumns);
    return () => window.removeEventListener('resize', calculateColumns);
  }, []);

  return columns;
}

/**
 * Calculate items per page based on 4 full rows
 */
export function useItemsPerPage(rows: number = 4): number {
  const columns = useGridColumns();
  return columns * rows;
}


'use client';

import { useHomepageData } from './HomepageDataProvider';
import { DestinationRow } from './DestinationRow';
import NavigationBar from './NavigationBar';
import { HomepageContent } from './HomepageContent';

/**
 * HomepageGridSection - Conditionally shows the destination row or full grid.
 *
 * By default shows a horizontal scrolling row preview.
 * When "Show All Destinations" is clicked, reveals the full grid with nav bar.
 */
export function HomepageGridSection() {
  const { showGrid } = useHomepageData();

  if (!showGrid) {
    return <DestinationRow />;
  }

  return (
    <div id="destination-grid" className="w-full px-4 sm:px-6 md:px-10 mt-6 sm:mt-8">
      <NavigationBar />
      <HomepageContent />
    </div>
  );
}

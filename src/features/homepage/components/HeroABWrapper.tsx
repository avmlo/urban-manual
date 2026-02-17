'use client';

import { useEffect } from 'react';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { trackHeroImpression } from '@/lib/analytics/events';
import InteractiveHero from './InteractiveHero';

/**
 * A/B test wrapper for the homepage hero section.
 *
 * When the `simplifiedHero` feature flag is enabled, the InteractiveHero
 * already renders the simplified variant (single headline + CTAs + static
 * placeholder). This wrapper tracks which variant is shown for measurement.
 *
 * To run the A/B test:
 *   NEXT_PUBLIC_FEATURE_SIMPLIFIED_HERO=true npm run dev
 *
 * The current InteractiveHero already contains the simplified changes;
 * the flag exists so we can toggle back to a control version if needed.
 */
export function HeroABWrapper() {
  const variant = isFeatureEnabled('simplifiedHero') ? 'simplified' : 'control';

  useEffect(() => {
    trackHeroImpression(variant);
  }, [variant]);

  return <InteractiveHero />;
}

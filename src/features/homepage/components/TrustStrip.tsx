/**
 * TrustStrip - Social proof strip beneath the hero section
 *
 * Displays key proof points to establish authority and trust
 * with new visitors. Server component — no client-side JS needed.
 */

const proofPoints = [
  '897+ curated destinations',
  'Michelin-recognized restaurants',
  'Design hotels worldwide',
  'Updated weekly',
];

export function TrustStrip() {
  return (
    <div className="w-full px-6 md:px-10 py-6 border-t border-b border-[var(--editorial-border)]">
      <div className="flex items-center justify-between gap-6 overflow-x-auto no-scrollbar">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--editorial-text-tertiary)] flex-shrink-0">
          Trusted by travelers
        </p>
        <div className="flex items-center gap-8">
          {proofPoints.map((point) => (
            <span
              key={point}
              className="text-[13px] text-[var(--editorial-text-secondary)] flex-shrink-0 whitespace-nowrap"
            >
              {point}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

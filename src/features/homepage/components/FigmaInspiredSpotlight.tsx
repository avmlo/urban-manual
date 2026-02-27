'use client';

import { ArrowRight, Compass, MapPinned, Sparkles } from 'lucide-react';

const spotlightCards = [
  {
    title: 'Curated by neighborhood',
    description: 'Filter restaurants, hotels, and bars by walkable districts instead of generic city-wide lists.',
    icon: MapPinned,
  },
  {
    title: 'AI trip companion',
    description: 'Ask for a complete day plan and instantly save recommendations into a trip timeline.',
    icon: Sparkles,
  },
  {
    title: 'Discover hidden gems',
    description: 'Explore editor-picked places that match your taste, budget, and travel style.',
    icon: Compass,
  },
];

export default function FigmaInspiredSpotlight() {
  return (
    <section className="w-full rounded-3xl border border-neutral-200/70 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8 lg:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="space-y-4">
          <p className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-neutral-700">
            New Experience
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Design-forward planning for modern city travel.
          </h2>
          <p className="max-w-xl text-sm text-neutral-600 sm:text-base">
            Built from the latest visual direction, this new section highlights the fastest way to discover places and assemble a trip in minutes.
          </p>
          <a
            href="/discover"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Explore now
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {spotlightCards.map(card => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 transition hover:border-neutral-300 hover:bg-white"
              >
                <Icon className="mb-3 h-5 w-5 text-neutral-800" />
                <h3 className="text-sm font-semibold text-neutral-900">{card.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">{card.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

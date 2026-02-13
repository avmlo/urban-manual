"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTripBuilder } from "@/contexts/TripBuilderContext";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";
import {
  Map,
  Sparkles,
  Users,
  Calendar,
  Star,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react";
import type { ProactiveCard } from "@/app/api/intelligence/proactive/route";

const iconMap = {
  map: Map,
  sparkles: Sparkles,
  users: Users,
  calendar: Calendar,
  star: Star,
};

const urgencyStyles = {
  high: "border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-900/10",
  medium:
    "border-gray-200 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30",
  low: "border-gray-100 dark:border-gray-800/40 bg-white dark:bg-gray-900/20",
};

const urgencyIconStyles = {
  high: "text-amber-600 dark:text-amber-400",
  medium: "text-gray-600 dark:text-gray-400",
  low: "text-gray-400 dark:text-gray-500",
};

/**
 * IntelligenceCards — Proactive AI intelligence cards for the homepage.
 *
 * Renders 2-3 contextual cards below the hero for logged-in users.
 * Cards are fetched from /api/intelligence/proactive which orchestrates
 * calls to OpportunityDetectionService, TasteProfileEvolutionService,
 * AdvancedRecommendationEngine, and trip date checks.
 */
export function IntelligenceCards() {
  const { user } = useAuth();
  const router = useRouter();
  const { generateItinerary, openPanel } = useTripBuilder();
  const [cards, setCards] = useState<ProactiveCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Load previously dismissed cards from session storage
    try {
      const dismissed = sessionStorage.getItem("intelligence-cards-dismissed");
      if (dismissed) {
        setDismissedIds(new Set(JSON.parse(dismissed)));
      }
    } catch {
      // Ignore storage errors
    }

    fetch("/api/intelligence/proactive")
      .then((res) => res.json())
      .then((data) => {
        setCards(data.cards || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [user?.id]);

  const dismissCard = useCallback(
    (cardId: string) => {
      setDismissedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(cardId);
        try {
          sessionStorage.setItem(
            "intelligence-cards-dismissed",
            JSON.stringify([...next])
          );
        } catch {
          // Ignore storage errors
        }
        return next;
      });

      trackEvent({
        event_type: "click",
        metadata: {
          source: "intelligence_cards",
          action: "dismiss",
          card_id: cardId,
        },
      });
    },
    []
  );

  const handleAction = useCallback(
    (card: ProactiveCard) => {
      if (!card.action) return;

      trackEvent({
        event_type: "click",
        metadata: {
          source: "intelligence_cards",
          action: card.action.type,
          card_id: card.id,
          card_type: card.type,
        },
      });

      switch (card.action.type) {
        case "generate_itinerary": {
          const city = card.action.payload?.city as string;
          if (city) {
            generateItinerary(city, 3);
            openPanel();
          }
          break;
        }
        case "view_destination": {
          const slug = card.action.payload?.slug as string;
          const tripId = card.action.payload?.tripId as string;
          if (slug) {
            router.push(`/destination/${slug}`);
          } else if (tripId) {
            router.push(`/trips/${tripId}`);
          }
          break;
        }
        case "rate_places": {
          const tripId = card.action.payload?.tripId as string;
          if (tripId) {
            router.push(`/trips/${tripId}?review=true`);
          }
          break;
        }
        case "dismiss":
          dismissCard(card.id);
          break;
      }
    },
    [generateItinerary, openPanel, router, dismissCard]
  );

  // Don't render if not logged in, loading, or no cards
  if (!user) return null;

  const visibleCards = cards.filter((c: ProactiveCard) => !dismissedIds.has(c.id));
  if (!loading && visibleCards.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm tracking-wide uppercase text-gray-500 dark:text-gray-400">
          Your Intelligence
        </h2>
        <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading insights...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleCards.map((card) => (
            <IntelligenceCard
              key={card.id}
              card={card}
              onAction={handleAction}
              onDismiss={dismissCard}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function IntelligenceCard({
  card,
  onAction,
  onDismiss,
}: {
  card: ProactiveCard;
  onAction: (card: ProactiveCard) => void;
  onDismiss: (id: string) => void;
}) {
  const Icon = iconMap[card.icon] || Sparkles;
  const borderStyle = urgencyStyles[card.urgency] || urgencyStyles.low;
  const iconStyle = urgencyIconStyles[card.urgency] || urgencyIconStyles.low;

  return (
    <div
      className={`group relative rounded-xl border p-4 transition-all duration-200 hover:shadow-sm ${borderStyle}`}
    >
      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(card.id);
        }}
        className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`flex-shrink-0 mt-0.5 ${iconStyle}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white leading-snug pr-6">
            {card.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">
            {card.description}
          </p>

          {/* Action button */}
          {card.action && (
            <button
              onClick={() => onAction(card)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {card.action.label}
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default IntelligenceCards;

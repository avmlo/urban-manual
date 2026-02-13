"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Calendar, Star, X } from "lucide-react";

interface TripBannerData {
  type: "upcoming" | "post_trip";
  tripId: string;
  destination: string;
  daysUntil?: number;
  daysSince?: number;
  message: string;
}

/**
 * TripAwarenessBanner — Persistent banner for trip-aware nudges.
 *
 * Shows at the top of the homepage content area when:
 * - User has an upcoming trip within 14 days
 * - User recently completed a trip (within 14 days)
 *
 * The banner data comes from the same proactive intelligence API.
 * Uses session storage for dismiss state to avoid repeat annoyance.
 */
export function TripAwarenessBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [banner, setBanner] = useState<TripBannerData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    // Check if already dismissed this session
    try {
      const dismissedKey = sessionStorage.getItem("trip-banner-dismissed");
      if (dismissedKey) {
        setDismissed(true);
        return;
      }
    } catch {
      // Ignore storage errors
    }

    fetch("/api/intelligence/proactive")
      .then((res) => res.json())
      .then((data) => {
        const cards = data.cards || [];
        // Find trip nudge or post-trip card
        const tripCard = cards.find(
          (c: any) => c.type === "trip_nudge" || c.type === "post_trip"
        );
        if (tripCard) {
          setBanner({
            type: tripCard.type === "trip_nudge" ? "upcoming" : "post_trip",
            tripId: tripCard.action?.payload?.tripId || "",
            destination:
              tripCard.action?.payload?.destination || tripCard.meta?.destination || "",
            daysUntil: tripCard.meta?.daysUntil,
            daysSince: tripCard.meta?.daysSince,
            message: tripCard.description,
          });
        }
      })
      .catch(() => {
        // Silently fail
      });
  }, [user?.id]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem("trip-banner-dismissed", "true");
    } catch {
      // Ignore
    }
  }, []);

  const handleAction = useCallback(() => {
    if (!banner) return;
    if (banner.type === "post_trip" && banner.tripId) {
      router.push(`/trips/${banner.tripId}?review=true`);
    } else if (banner.tripId) {
      router.push(`/trips/${banner.tripId}`);
    }
  }, [banner, router]);

  if (!user || !banner || dismissed) return null;

  const isUpcoming = banner.type === "upcoming";
  const Icon = isUpcoming ? Calendar : Star;

  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border px-4 py-3 mb-6 transition-all duration-200 ${
        isUpcoming
          ? "border-blue-200 dark:border-blue-800/50 bg-blue-50/60 dark:bg-blue-900/10"
          : "border-violet-200 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-900/10"
      }`}
    >
      <Icon
        className={`h-5 w-5 flex-shrink-0 ${
          isUpcoming
            ? "text-blue-600 dark:text-blue-400"
            : "text-violet-600 dark:text-violet-400"
        }`}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200">
          <span className="font-medium">{banner.destination}</span>
          {isUpcoming && banner.daysUntil !== undefined && (
            <span>
              {" "}
              in {banner.daysUntil} day{banner.daysUntil !== 1 ? "s" : ""}
            </span>
          )}
          {!isUpcoming && <span> — how was it?</span>}
          <span className="text-gray-500 dark:text-gray-400"> · </span>
          <button
            onClick={handleAction}
            className={`font-medium hover:underline ${
              isUpcoming
                ? "text-blue-600 dark:text-blue-400"
                : "text-violet-600 dark:text-violet-400"
            }`}
          >
            {isUpcoming ? "Review itinerary" : "Rate your places"}
          </button>
        </p>
      </div>

      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default TripAwarenessBanner;

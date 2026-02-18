"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Eye, EyeOff, MapPin } from "lucide-react";
import type { Destination } from "@/types/destination";
import { useDestinationLibraryStore } from "./destination-store";
import { cn } from "@/lib/utils";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "URBAN_MANUAL_MAP";
const WORLD_CENTER = { lat: 48, lng: 10 };
const DEFAULT_ZOOM = 3;
const SELECTED_ZOOM = 13;

/** Load Google Maps script once, returning when ready */
function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.Map) {
      resolve();
      return;
    }

    if (document.querySelector("script[data-google-maps]")) {
      const check = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=marker&loading=async`;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-google-maps", "true");
    script.onload = () => {
      const poll = () => {
        if (window.google?.maps?.Map) resolve();
        else setTimeout(poll, 50);
      };
      poll();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

interface DestinationMapViewProps {
  destinations: Destination[];
}

export function DestinationMapView({ destinations }: DestinationMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedSlug = useDestinationLibraryStore((s) => s.selectedDestinationSlug);
  const selectDestination = useDestinationLibraryStore((s) => s.selectDestination);
  const layoutMode = useDestinationLibraryStore((s) => s.layoutMode);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !GOOGLE_API_KEY) return;

    let cancelled = false;

    async function initMap() {
      try {
        await loadGoogleMaps();
        if (cancelled || !mapContainerRef.current) return;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: WORLD_CENTER,
          zoom: DEFAULT_ZOOM,
          minZoom: 3,
          maxZoom: 20,
          mapId: GOOGLE_MAP_ID,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        if (!cancelled) {
          mapRef.current = map;
          setMapLoaded(true);
        }
      } catch {
        if (!cancelled) setError("Failed to load Google Maps");
      }
    }

    initMap();

    const markers = markersRef.current;
    return () => {
      cancelled = true;
      markers.forEach((marker) => {
        marker.map = null;
      });
      markers.clear();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  const createMarkerEl = useCallback(
    (slug: string, isActive: boolean) => {
      const el = document.createElement("div");
      el.style.cssText = `
        width: ${isActive ? "36px" : "28px"};
        height: ${isActive ? "36px" : "28px"};
        border-radius: 50%;
        background: ${isActive ? "#1A1A1A" : "#C75B2A"};
        border: 3px solid white;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: transform 0.15s ease, background 0.15s ease, width 0.15s ease, height 0.15s ease;
      `;
      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.2)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectDestination(slug);
      });
      return el;
    },
    [selectDestination]
  );

  // Sync markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !window.google?.maps) return;

    // Remove stale markers
    const currentSlugs = new Set(destinations.map((d) => d.slug));
    markersRef.current.forEach((marker, slug) => {
      if (!currentSlugs.has(slug)) {
        marker.map = null;
        markersRef.current.delete(slug);
      }
    });

    destinations.forEach((dest) => {
      if (!dest.latitude || !dest.longitude) return;

      const existing = markersRef.current.get(dest.slug);
      const isActive = dest.slug === selectedSlug;

      if (existing) {
        const el = existing.content as HTMLElement;
        if (el) {
          el.style.background = isActive ? "#1A1A1A" : "#C75B2A";
          el.style.width = isActive ? "36px" : "28px";
          el.style.height = isActive ? "36px" : "28px";
          el.style.display = showPins ? "block" : "none";
        }
      } else {
        const el = createMarkerEl(dest.slug, isActive);
        el.style.display = showPins ? "block" : "none";

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current!,
          position: { lat: dest.latitude, lng: dest.longitude },
          content: el,
          title: dest.name || "",
        });
        markersRef.current.set(dest.slug, marker);
      }
    });
  }, [destinations, selectedSlug, mapLoaded, showPins, createMarkerEl]);

  // Pan to selected
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedSlug) return;

    const dest = destinations.find((d) => d.slug === selectedSlug);
    if (dest?.latitude && dest?.longitude) {
      mapRef.current.panTo({ lat: dest.latitude, lng: dest.longitude });
      mapRef.current.setZoom(SELECTED_ZOOM);
    }
  }, [selectedSlug, mapLoaded, destinations]);

  // Resize on layout change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    requestAnimationFrame(() => {
      google.maps.event.trigger(mapRef.current!, "resize");
    });
  }, [layoutMode, mapLoaded]);

  return (
    <div className="relative w-full h-full bg-gray-100">
      <div ref={mapContainerRef} className="w-full h-full" />

      {!GOOGLE_API_KEY && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-6">
            <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Map requires NEXT_PUBLIC_GOOGLE_API_KEY</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-6">
            <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      )}

      {/* Toggle pins */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setShowPins(!showPins)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium shadow-md border transition-colors",
            showPins
              ? "bg-white text-[#1A1A1A] border-[#E8E2D9]"
              : "bg-gray-800 text-white border-gray-700"
          )}
        >
          Pins
          {showPins ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

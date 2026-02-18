"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Eye, EyeOff, MapPin } from "lucide-react";
import type { Destination } from "@/types/destination";
import { useDestinationLibraryStore } from "./destination-store";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const WORLD_CENTER: [number, number] = [10, 48];
const DEFAULT_ZOOM = 3;
const SELECTED_ZOOM = 13;

function ensureMapboxCss() {
  if (typeof document === "undefined") return;
  const id = "mapbox-gl-css";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css";
  document.head.appendChild(link);
}

interface DestinationMapViewProps {
  destinations: Destination[];
}

export function DestinationMapView({ destinations }: DestinationMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const mbRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPins, setShowPins] = useState(true);

  const selectedSlug = useDestinationLibraryStore((s) => s.selectedDestinationSlug);
  const selectDestination = useDestinationLibraryStore((s) => s.selectDestination);
  const layoutMode = useDestinationLibraryStore((s) => s.layoutMode);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;

    let cancelled = false;

    async function initMap() {
      ensureMapboxCss();
      const mapboxgl = (await import("mapbox-gl")).default;
      mbRef.current = mapboxgl;

      if (cancelled || !mapContainerRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: WORLD_CENTER,
        zoom: DEFAULT_ZOOM,
      });

      map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

      map.on("load", () => {
        if (!cancelled) {
          mapRef.current = map;
          setMapLoaded(true);
        }
      });
    }

    initMap();

    const markers = markersRef.current;
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markers.clear();
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
    if (!mapRef.current || !mapLoaded || !mbRef.current) return;

    const mb = mbRef.current;

    // Remove stale markers
    const currentSlugs = new Set(destinations.map((d) => d.slug));
    markersRef.current.forEach((marker, slug) => {
      if (!currentSlugs.has(slug)) {
        marker.remove();
        markersRef.current.delete(slug);
      }
    });

    destinations.forEach((dest) => {
      if (!dest.latitude || !dest.longitude) return;

      const existing = markersRef.current.get(dest.slug);
      const isActive = dest.slug === selectedSlug;

      if (existing) {
        const el = existing.getElement();
        el.style.background = isActive ? "#1A1A1A" : "#C75B2A";
        el.style.width = isActive ? "36px" : "28px";
        el.style.height = isActive ? "36px" : "28px";
        el.style.display = showPins ? "block" : "none";
      } else {
        const el = createMarkerEl(dest.slug, isActive);
        el.style.display = showPins ? "block" : "none";

        const marker = new mb.Marker({ element: el })
          .setLngLat([dest.longitude, dest.latitude])
          .addTo(mapRef.current);
        markersRef.current.set(dest.slug, marker);
      }
    });
  }, [destinations, selectedSlug, mapLoaded, showPins, createMarkerEl]);

  // Fly to selected
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedSlug) return;

    const dest = destinations.find((d) => d.slug === selectedSlug);
    if (dest?.latitude && dest?.longitude) {
      mapRef.current.flyTo({
        center: [dest.longitude, dest.latitude],
        zoom: SELECTED_ZOOM,
        duration: 800,
      });
    }
  }, [selectedSlug, mapLoaded, destinations]);

  // Resize on layout change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    requestAnimationFrame(() => { mapRef.current?.resize(); });
  }, [layoutMode, mapLoaded]);

  return (
    <div className="relative w-full h-full bg-gray-100">
      <div ref={mapContainerRef} className="w-full h-full" />

      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-6">
            <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Map requires NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</p>
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

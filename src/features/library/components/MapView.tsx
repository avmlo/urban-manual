"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Eye, EyeOff, MapPin } from "lucide-react";
import { useResourceLibraryStore, useFilteredResources } from "../lib/resource-store";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type MapboxModule = any;

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const COPENHAGEN_CENTER: [number, number] = [12.568, 55.676];
const DEFAULT_ZOOM = 12;
const SELECTED_ZOOM = 15;

/** Inject mapbox-gl CSS once via <link> tag */
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

export function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const mbRef = useRef<MapboxModule>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);

  const resources = useFilteredResources();
  const selectedResourceId = useResourceLibraryStore((s) => s.selectedResourceId);
  const selectResource = useResourceLibraryStore((s) => s.selectResource);
  const layoutMode = useResourceLibraryStore((s) => s.layoutMode);

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
        center: COPENHAGEN_CENTER,
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

  // Create custom marker element
  const createMarkerEl = useCallback(
    (resourceId: string, isActive: boolean) => {
      const el = document.createElement("div");
      el.className = "library-map-marker";
      el.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${isActive ? "#1A1A1A" : "#C75B2A"};
        border: 3px solid white;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: transform 0.15s ease, background 0.15s ease;
      `;
      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectResource(resourceId);
      });
      return el;
    },
    [selectResource]
  );

  // Sync markers with resources
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !mbRef.current) return;

    const mb = mbRef.current;
    const visible = showPins && showLibrary;

    // Remove markers not in current filtered set
    const currentIds = new Set(resources.map((r) => r.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    resources.forEach((resource) => {
      if (!resource.lat || !resource.lng) return;

      const existing = markersRef.current.get(resource.id);
      const isActive = resource.id === selectedResourceId;

      if (existing) {
        const el = existing.getElement();
        el.style.background = isActive ? "#1A1A1A" : "#C75B2A";
        el.style.display = visible ? "block" : "none";
      } else {
        const el = createMarkerEl(resource.id, isActive);
        el.style.display = visible ? "block" : "none";

        const marker = new mb.Marker({ element: el })
          .setLngLat([resource.lng!, resource.lat!])
          .addTo(mapRef.current);
        markersRef.current.set(resource.id, marker);
      }
    });
  }, [resources, selectedResourceId, mapLoaded, showPins, showLibrary, createMarkerEl]);

  // Fly to selected resource
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedResourceId) return;

    const resource = resources.find((r) => r.id === selectedResourceId);
    if (resource?.lat && resource?.lng) {
      mapRef.current.flyTo({
        center: [resource.lng, resource.lat],
        zoom: SELECTED_ZOOM,
        duration: 800,
      });
    }
  }, [selectedResourceId, mapLoaded, resources]);

  // Resize map when layout mode changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    requestAnimationFrame(() => {
      mapRef.current?.resize();
    });
  }, [layoutMode, mapLoaded]);

  return (
    <div className="relative w-full h-full bg-gray-100">
      <div ref={mapContainerRef} className="w-full h-full" />

      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-6">
            <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Map requires NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
            </p>
          </div>
        </div>
      )}

      {/* Map toggle controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium shadow-md border transition-colors",
            showLibrary
              ? "bg-white text-[#1A1A1A] border-[#E8E2D9]"
              : "bg-gray-800 text-white border-gray-700"
          )}
        >
          Library
          {showLibrary ? (
            <Eye className="w-3.5 h-3.5" />
          ) : (
            <EyeOff className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={() => setShowPins(!showPins)}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg shadow-md border transition-colors",
            showPins
              ? "bg-white text-[#C75B2A] border-[#E8E2D9]"
              : "bg-gray-800 text-white border-gray-700"
          )}
        >
          <MapPin className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

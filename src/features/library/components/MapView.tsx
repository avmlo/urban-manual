"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Eye, EyeOff, MapPin } from "lucide-react";
import { useResourceLibraryStore, useFilteredResources } from "../lib/resource-store";
import { cn } from "@/lib/utils";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "URBAN_MANUAL_MAP";
const COPENHAGEN_CENTER = { lat: 55.676, lng: 12.568 };
const DEFAULT_ZOOM = 12;
const SELECTED_ZOOM = 15;

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

export function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resources = useFilteredResources();
  const selectedResourceId = useResourceLibraryStore((s) => s.selectedResourceId);
  const selectResource = useResourceLibraryStore((s) => s.selectResource);
  const layoutMode = useResourceLibraryStore((s) => s.layoutMode);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || !GOOGLE_API_KEY) return;

    let cancelled = false;

    async function initMap() {
      try {
        await loadGoogleMaps();
        if (cancelled || !mapContainerRef.current) return;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: COPENHAGEN_CENTER,
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

  // Create custom marker element
  const createMarkerEl = useCallback(
    (resourceId: string, isActive: boolean) => {
      const el = document.createElement("div");
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
    if (!mapRef.current || !mapLoaded || !window.google?.maps) return;

    const visible = showPins && showLibrary;

    // Remove markers not in current filtered set
    const currentIds = new Set(resources.map((r) => r.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.map = null;
        markersRef.current.delete(id);
      }
    });

    resources.forEach((resource) => {
      if (!resource.lat || !resource.lng) return;

      const existing = markersRef.current.get(resource.id);
      const isActive = resource.id === selectedResourceId;

      if (existing) {
        const el = existing.content as HTMLElement;
        if (el) {
          el.style.background = isActive ? "#1A1A1A" : "#C75B2A";
          el.style.display = visible ? "block" : "none";
        }
      } else {
        const el = createMarkerEl(resource.id, isActive);
        el.style.display = visible ? "block" : "none";

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current!,
          position: { lat: resource.lat, lng: resource.lng },
          content: el,
          title: resource.name,
        });
        markersRef.current.set(resource.id, marker);
      }
    });
  }, [resources, selectedResourceId, mapLoaded, showPins, showLibrary, createMarkerEl]);

  // Pan to selected resource
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedResourceId) return;

    const resource = resources.find((r) => r.id === selectedResourceId);
    if (resource?.lat && resource?.lng) {
      mapRef.current.panTo({ lat: resource.lat, lng: resource.lng });
      mapRef.current.setZoom(SELECTED_ZOOM);
    }
  }, [selectedResourceId, mapLoaded, resources]);

  // Trigger resize when layout mode changes
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
            <p className="text-sm text-gray-500">
              Map requires NEXT_PUBLIC_GOOGLE_API_KEY
            </p>
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

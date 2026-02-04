# Google API Implementation Guide for Urban Manual

**Date:** October 31, 2025  
**Author:** Manus AI  
**Status:** Implementation Examples

---

## Overview

This document provides ready-to-use code examples for integrating the top 5 priority Google APIs into Urban Manual. Each section includes setup instructions, complete code snippets, and best practices.

---

## 1. Maps JavaScript API - Interactive City Map

### Setup

```bash
# Add to .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Implementation

Create a new component: `components/DestinationMap.tsx`

```typescript
'use client'

import { useEffect, useRef } from 'react'

interface Destination {
  id: number
  name: string
  latitude: number
  longitude: number
  category: string
}

interface DestinationMapProps {
  destinations: Destination[]
  center?: { lat: number; lng: number }
  zoom?: number
}

export default function DestinationMap({ 
  destinations, 
  center = { lat: 35.6762, lng: 139.6503 }, // Tokyo default
  zoom = 12 
}: DestinationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    // Load Google Maps script
    if (!window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,marker`
      script.async = true
      script.defer = true
      document.head.appendChild(script)
      
      script.onload = () => initializeMap()
    } else {
      initializeMap()
    }
  }, [])

  useEffect(() => {
    if (googleMapRef.current && destinations.length > 0) {
      addMarkers()
    }
  }, [destinations])

  const initializeMap = () => {
    if (!mapRef.current) return

    googleMapRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapId: 'URBAN_MANUAL_MAP', // Required for Advanced Markers
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })

    addMarkers()
  }

  const addMarkers = () => {
    if (!googleMapRef.current) return

    destinations.forEach((destination) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: googleMapRef.current!,
        position: { 
          lat: destination.latitude, 
          lng: destination.longitude 
        },
        title: destination.name,
      })

      // Info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">
              ${destination.name}
            </h3>
            <p style="margin: 0; font-size: 12px; color: #666;">
              ${destination.category}
            </p>
            <a 
              href="/destinations/${destination.id}" 
              style="display: inline-block; margin-top: 8px; font-size: 12px; color: #0066cc;"
            >
              View Details →
            </a>
          </div>
        `,
      })

      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current!, marker)
      })
    })
  }

  return (
    <div 
      ref={mapRef} 
      className="w-full h-[600px] rounded-lg border border-gray-200"
    />
  )
}
```

### Usage

```typescript
// app/cities/[city]/page.tsx
import DestinationMap from '@/components/DestinationMap'
import { supabase } from '@/lib/supabase'

export default async function CityPage({ params }: { params: { city: string } }) {
  const { data: destinations } = await supabase
    .from('destinations')
    .select('id, name, latitude, longitude, category')
    .eq('city', params.city)

  return (
    <div>
      <h1>Explore {params.city}</h1>
      <DestinationMap destinations={destinations || []} />
    </div>
  )
}
```

---

## 2. Places API (New) - Destination Enrichment

### Setup

```bash
npm install @googlemaps/places
```

### Implementation

Create a server-side enrichment script: `scripts/enrich_destinations.ts`

```typescript
import { PlacesClient } from '@googlemaps/places'
import { supabase } from '../lib/supabase'

const placesClient = new PlacesClient({
  apiKey: process.env.GOOGLE_MAPS_API_KEY!,
})

interface Destination {
  id: number
  name: string
  latitude: number
  longitude: number
  google_place_id?: string
}

async function enrichDestination(destination: Destination) {
  try {
    // Find the place
    const searchResponse = await placesClient.searchNearby({
      locationRestriction: {
        circle: {
          center: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
          radius: 50, // 50 meters
        },
      },
      includedTypes: ['restaurant', 'cafe', 'bar', 'museum', 'store'],
      maxResultCount: 1,
    })

    const place = searchResponse.places?.[0]
    if (!place) {
      console.log(`No place found for: ${destination.name}`)
      return
    }

    // Get detailed info
    const placeDetails = await placesClient.getPlace({
      name: place.name!,
      fields: [
        'displayName',
        'formattedAddress',
        'rating',
        'userRatingCount',
        'priceLevel',
        'regularOpeningHours',
        'photos',
        'editorialSummary',
        'websiteUri',
      ],
    })

    // Extract photo URLs
    const photoUrls = placeDetails.photos?.slice(0, 5).map((photo) => {
      return `https://places.googleapis.com/v1/${photo.name}/media?key=${process.env.GOOGLE_MAPS_API_KEY}&maxHeightPx=1200`
    })

    // Update Supabase
    await supabase
      .from('destinations')
      .update({
        google_place_id: place.id,
        google_rating: placeDetails.rating,
        google_review_count: placeDetails.userRatingCount,
        google_price_level: placeDetails.priceLevel,
        google_photos: photoUrls,
        google_hours: placeDetails.regularOpeningHours?.weekdayDescriptions,
        google_summary: placeDetails.editorialSummary?.text,
        google_website: placeDetails.websiteUri,
        enriched_at: new Date().toISOString(),
      })
      .eq('id', destination.id)

    console.log(`✓ Enriched: ${destination.name}`)
  } catch (error) {
    console.error(`✗ Error enriching ${destination.name}:`, error)
  }
}

async function enrichAllDestinations() {
  const { data: destinations } = await supabase
    .from('destinations')
    .select('id, name, latitude, longitude, google_place_id')
    .is('enriched_at', null) // Only enrich new destinations
    .limit(100) // Process in batches

  if (!destinations) return

  for (const destination of destinations) {
    await enrichDestination(destination)
    // Rate limiting: 1 request per second
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  console.log(`\n✅ Enriched ${destinations.length} destinations`)
}

enrichAllDestinations()
```

### Run as Cron Job

```typescript
// Add to package.json
{
  "scripts": {
    "enrich": "tsx scripts/enrich_destinations.ts"
  }
}

// Run daily via Vercel Cron or GitHub Actions
```

---

## 3. Routes API - AI Itinerary Planner

### Implementation

Create an API route: `app/api/itinerary/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { destinationIds } = await request.json()

  // Fetch destinations from Supabase
  const { data: destinations } = await supabase
    .from('destinations')
    .select('id, name, latitude, longitude, address')
    .in('id', destinationIds)

  if (!destinations || destinations.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 destinations' }, { status: 400 })
  }

  // Build waypoints
  const origin = {
    location: {
      latLng: {
        latitude: destinations[0].latitude,
        longitude: destinations[0].longitude,
      },
    },
  }

  const destination = {
    location: {
      latLng: {
        latitude: destinations[destinations.length - 1].latitude,
        longitude: destinations[destinations.length - 1].longitude,
      },
    },
  }

  const intermediates = destinations.slice(1, -1).map((dest) => ({
    location: {
      latLng: {
        latitude: dest.latitude,
        longitude: dest.longitude,
      },
    },
  }))

  // Call Routes API
  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY!,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs',
    },
    body: JSON.stringify({
      origin,
      destination,
      intermediates,
      travelMode: 'WALK',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      languageCode: 'en-US',
      units: 'METRIC',
    }),
  })

  const data = await response.json()
  const route = data.routes?.[0]

  if (!route) {
    return NextResponse.json({ error: 'No route found' }, { status: 404 })
  }

  // Format response
  return NextResponse.json({
    totalDuration: route.duration,
    totalDistance: route.distanceMeters,
    polyline: route.polyline.encodedPolyline,
    legs: route.legs.map((leg: any, index: number) => ({
      from: destinations[index].name,
      to: destinations[index + 1].name,
      duration: leg.duration,
      distance: leg.distanceMeters,
    })),
  })
}
```

---

## 4. Geocoding API - Address to Coordinates

### Implementation

Create a utility function: `lib/geocoding.ts`

```typescript
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', address)
  url.searchParams.set('key', process.env.GOOGLE_MAPS_API_KEY!)

  const response = await fetch(url.toString())
  const data = await response.json()

  if (data.status === 'OK' && data.results.length > 0) {
    const location = data.results[0].geometry.location
    return { lat: location.lat, lng: location.lng }
  }

  return null
}

// Usage in admin panel
async function addDestination(name: string, address: string) {
  const coords = await geocodeAddress(address)
  
  if (!coords) {
    throw new Error('Could not geocode address')
  }

  await supabase.from('destinations').insert({
    name,
    address,
    latitude: coords.lat,
    longitude: coords.lng,
  })
}
```

---

## 5. Discovery Engine API - Semantic Search

### Setup

This requires a Google Cloud project with Discovery Engine enabled and a search app configured.

### Implementation

Create a search API route: `app/api/search/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { SearchServiceClient } from '@google-cloud/discoveryengine'

const client = new SearchServiceClient()

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  
  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!
  const location = 'global'
  const dataStoreId = 'urban-manual-destinations'

  const name = client.projectLocationCollectionDataStorePath(
    projectId,
    location,
    'default_collection',
    dataStoreId
  )

  const [response] = await client.search({
    servingConfig: `${name}/servingConfigs/default_config`,
    query,
    pageSize: 20,
  })

  const results = response.results?.map((result) => ({
    id: result.document?.derivedStructData?.fields?.id?.stringValue,
    name: result.document?.derivedStructData?.fields?.name?.stringValue,
    category: result.document?.derivedStructData?.fields?.category?.stringValue,
    relevanceScore: result.relevanceScore,
  }))

  return NextResponse.json({ results })
}
```

---

## Best Practices

1.  **API Key Security:** Never expose your API key in client-side code. Use environment variables and server-side routes.
2.  **Rate Limiting:** Implement caching and rate limiting to avoid exceeding quotas.
3.  **Error Handling:** Always handle API errors gracefully and provide fallback experiences.
4.  **Cost Management:** Monitor usage in the Google Cloud Console and set budget alerts.

---

This implementation guide provides a solid foundation for integrating Google's powerful APIs into Urban Manual. Start with the Maps JavaScript API for immediate visual impact, then layer in the other services to build a truly intelligent travel platform.


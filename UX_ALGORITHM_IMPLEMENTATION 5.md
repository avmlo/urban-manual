# Urban Manual: UX Algorithm Implementation Guide

**Date:** October 31, 2025  
**Author:** Manus AI  
**Status:** Technical Implementation

---

## Overview

This document provides ready-to-use code examples for implementing the UX algorithms outlined in the `UX_ALGORITHM_PLAN.md`. Each section includes database schemas, API routes, and frontend components.

---

## 1. User Taste Profile System

### 1.1. Database Schema

Add these columns to your existing `profiles` table:

```sql
-- Add taste profile columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS taste_profile JSONB DEFAULT '{
  "travel_style": null,
  "interests": [],
  "travel_companions": null,
  "budget_preference": null
}'::jsonb;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS implicit_interests JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS explorer_score INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Novice';
```

### 1.2. Onboarding Component

Create `components/TasteProfileOnboarding.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const TRAVEL_STYLES = ['Luxury', 'Budget', 'Adventure', 'Relaxation', 'Cultural']
const INTERESTS = ['Food', 'Art', 'History', 'Nightlife', 'Shopping', 'Nature', 'Architecture']
const COMPANIONS = ['Solo', 'Partner', 'Family', 'Friends']

export default function TasteProfileOnboarding({ userId }: { userId: string }) {
  const [travelStyle, setTravelStyle] = useState<string>('')
  const [interests, setInterests] = useState<string[]>([])
  const [companions, setCompanions] = useState<string>('')

  const handleSubmit = async () => {
    await supabase
      .from('profiles')
      .update({
        taste_profile: {
          travel_style: travelStyle,
          interests,
          travel_companions: companions,
        },
      })
      .eq('id', userId)

    // Redirect to homepage
    window.location.href = '/'
  }

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Tell us about your travel style</h1>

      {/* Travel Style */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">What's your travel style?</h2>
        <div className="grid grid-cols-2 gap-3">
          {TRAVEL_STYLES.map((style) => (
            <button
              key={style}
              onClick={() => setTravelStyle(style)}
              className={`p-4 rounded-lg border-2 transition ${
                travelStyle === style
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">What are you interested in?</h2>
        <div className="grid grid-cols-3 gap-3">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`p-3 rounded-lg border-2 transition ${
                interests.includes(interest)
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      {/* Companions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Who do you usually travel with?</h2>
        <div className="grid grid-cols-2 gap-3">
          {COMPANIONS.map((companion) => (
            <button
              key={companion}
              onClick={() => setCompanions(companion)}
              className={`p-4 rounded-lg border-2 transition ${
                companions === companion
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {companion}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!travelStyle || interests.length === 0 || !companions}
        className="w-full p-4 bg-black text-white rounded-lg font-semibold disabled:opacity-50"
      >
        Complete Setup
      </button>
    </div>
  )
}
```

---

## 2. Manual Score Calculation

### 2.1. Server-Side Function

Create `lib/manual-score.ts`:

```typescript
import { supabase } from './supabase'

interface UserProfile {
  taste_profile: {
    travel_style: string
    interests: string[]
    travel_companions: string
  }
  implicit_interests: Record<string, number>
}

interface ContentItem {
  id: number
  name: string
  category: string
  tags: string[]
  rating: number
  review_count: number
  created_at: string
  latitude: number
  longitude: number
}

interface ManualScoreResult {
  item: ContentItem
  score: number
  breakdown: {
    pScore: number
    cScore: number
    qScore: number
    tScore: number
  }
}

export async function calculateManualScore(
  userProfile: UserProfile,
  contentItem: ContentItem,
  context?: {
    userLocation?: { lat: number; lng: number }
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
  }
): Promise<ManualScoreResult> {
  // P-Score: Personalization (40%)
  let pScore = 0
  
  // Match interests
  const interestOverlap = userProfile.taste_profile.interests.filter((i) =>
    contentItem.tags.includes(i.toLowerCase())
  )
  pScore += interestOverlap.length * 10

  // Match travel style
  if (contentItem.tags.includes(userProfile.taste_profile.travel_style.toLowerCase())) {
    pScore += 20
  }

  // Boost based on implicit interests
  for (const tag of contentItem.tags) {
    if (userProfile.implicit_interests[tag]) {
      pScore += userProfile.implicit_interests[tag] * 2
    }
  }

  // C-Score: Context (30%)
  let cScore = 0

  // Location proximity
  if (context?.userLocation) {
    const distance = calculateDistance(
      context.userLocation,
      { lat: contentItem.latitude, lng: contentItem.longitude }
    )
    if (distance < 1) cScore += 30 // Within 1km
    else if (distance < 5) cScore += 20 // Within 5km
    else if (distance < 10) cScore += 10 // Within 10km
  }

  // Time of day relevance
  if (context?.timeOfDay) {
    if (context.timeOfDay === 'morning' && contentItem.category === 'Cafe') cScore += 15
    if (context.timeOfDay === 'evening' && contentItem.category === 'Restaurant') cScore += 15
    if (context.timeOfDay === 'night' && contentItem.category === 'Bar') cScore += 15
  }

  // Q-Score: Quality (20%)
  let qScore = 0
  qScore += Math.min(contentItem.rating * 4, 20) // Max 20 points for 5-star rating
  qScore += Math.min(contentItem.review_count / 10, 10) // Bonus for popularity

  // T-Score: Temporal (10%)
  let tScore = 0
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(contentItem.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceCreated < 7) tScore = 10
  else if (daysSinceCreated < 30) tScore = 7
  else if (daysSinceCreated < 90) tScore = 4

  // Weighted final score
  const finalScore =
    pScore * 0.4 + cScore * 0.3 + qScore * 0.2 + tScore * 0.1

  return {
    item: contentItem,
    score: finalScore,
    breakdown: { pScore, cScore, qScore, tScore },
  }
}

function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  // Haversine formula
  const R = 6371 // Earth's radius in km
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180
  const dLng = ((point2.lng - point1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
```

---

## 3. Personalized Homepage API

Create `app/api/personalized-feed/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateManualScore } from '@/lib/manual-score'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  const userLat = parseFloat(request.nextUrl.searchParams.get('lat') || '0')
  const userLng = parseFloat(request.nextUrl.searchParams.get('lng') || '0')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('taste_profile, implicit_interests')
    .eq('id', userId)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Fetch all destinations
  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .limit(100)

  if (!destinations) {
    return NextResponse.json({ error: 'No destinations found' }, { status: 404 })
  }

  // Calculate Manual Score for each
  const scoredDestinations = await Promise.all(
    destinations.map((dest) =>
      calculateManualScore(profile, dest, {
        userLocation: { lat: userLat, lng: userLng },
        timeOfDay: getTimeOfDay(),
      })
    )
  )

  // Sort by score
  scoredDestinations.sort((a, b) => b.score - a.score)

  return NextResponse.json({
    feed: scoredDestinations.slice(0, 20), // Top 20
  })
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}
```

---

## 4. Gamification System

### 4.1. Award Points Function

Create `lib/gamification.ts`:

```typescript
import { supabase } from './supabase'

const POINT_VALUES = {
  SAVE_DESTINATION: 5,
  CREATE_LIST: 10,
  COMPLETE_TRIP: 50,
  WRITE_REVIEW: 25,
  UPLOAD_PHOTO: 10,
}

const LEVELS = [
  { name: 'Novice', minPoints: 0 },
  { name: 'Explorer', minPoints: 100 },
  { name: 'Local', minPoints: 500 },
  { name: 'Globetrotter', minPoints: 1000 },
  { name: 'Legend', minPoints: 5000 },
]

export async function awardPoints(
  userId: string,
  action: keyof typeof POINT_VALUES
) {
  const points = POINT_VALUES[action]

  // Update user's score
  const { data: profile } = await supabase
    .from('profiles')
    .select('explorer_score, level')
    .eq('id', userId)
    .single()

  if (!profile) return

  const newScore = profile.explorer_score + points
  const newLevel = LEVELS.reverse().find((l) => newScore >= l.minPoints)?.name || 'Novice'

  await supabase
    .from('profiles')
    .update({
      explorer_score: newScore,
      level: newLevel,
    })
    .eq('id', userId)

  return { newScore, newLevel, pointsAwarded: points }
}
```

---

This implementation guide provides the core building blocks for the UX algorithm system. Start with the User Taste Profile and Manual Score calculation, then layer in the other systems progressively.


/*
  Enrich destinations from Google APIs (Places Details, Time Zone)
  Excludes: photos, Street View, elevation
*/
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}
if (!GOOGLE_API_KEY) {
  console.error('Missing GOOGLE_API_KEY or NEXT_PUBLIC_GOOGLE_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

type Row = {
  slug: string
  name: string
  city: string
  google_place_id: string | null
}

async function findPlaceId(query: string): Promise<string | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json')
  url.searchParams.set('input', query)
  url.searchParams.set('inputtype', 'textquery')
  url.searchParams.set('fields', 'place_id')
  url.searchParams.set('key', GOOGLE_API_KEY!)
  const r = await fetch(url.toString())
  const j = await r.json()
  return j?.candidates?.[0]?.place_id || null
}

async function getPlaceDetails(placeId: string) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', [
    'formatted_address',
    'international_phone_number',
    'website',
    'price_level',
    'rating',
    'user_ratings_total',
    'opening_hours',
    'plus_code',
    'geometry',
    'review',
    'editorial_summary'
  ].join(','))
  url.searchParams.set('key', GOOGLE_API_KEY!)
  const r = await fetch(url.toString())
  const j = await r.json()
  return j?.result || null
}

async function getTimeZone(lat: number, lng: number) {
  const url = new URL('https://maps.googleapis.com/maps/api/timezone/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('timestamp', Math.floor(Date.now() / 1000).toString())
  url.searchParams.set('key', GOOGLE_API_KEY!)
  const r = await fetch(url.toString())
  const j = await r.json()
  return j?.timeZoneId || null
}

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)) }

async function run() {
  console.log('Starting Google enrichment...')
  const { data: rows, error } = await supabase
    .from('destinations')
    .select('slug,name,city,google_place_id')
    .limit(5000)
  if (error) throw error

  for (const row of rows as Row[]) {
    try {
      const query = `${row.name} ${row.city}`
      let placeId = row.google_place_id
      if (!placeId) {
        placeId = await findPlaceId(query)
        await sleep(120)
      }
      if (!placeId) {
        console.warn('No place_id for', row.slug)
        continue
      }

      const details = await getPlaceDetails(placeId)
      await sleep(150)
      if (!details) {
        console.warn('No details for', row.slug)
        continue
      }

      const lat = details.geometry?.location?.lat
      const lng = details.geometry?.location?.lng
      let timezone_id: string | null = null
      if (lat != null && lng != null) {
        timezone_id = await getTimeZone(lat, lng)
        await sleep(120)
      }

      const reviews = Array.isArray(details.reviews) ? details.reviews.slice(0, 5).map((r: any) => ({
        author_name: r.author_name,
        rating: r.rating,
        text: r.text,
        time: r.time,
        relative_time_description: r.relative_time_description,
        language: r.language,
      })) : []

      const update = {
        google_place_id: placeId,
        formatted_address: details.formatted_address || null,
        international_phone_number: details.international_phone_number || null,
        website: details.website || null,
        price_level: details.price_level ?? null,
        rating: details.rating ?? null,
        user_ratings_total: details.user_ratings_total ?? null,
        opening_hours_json: details.opening_hours ? JSON.stringify(details.opening_hours) : null,
        plus_code: details.plus_code?.global_code || null,
        latitude: lat ?? null,
        longitude: lng ?? null,
        timezone_id: timezone_id,
        reviews_json: reviews.length ? JSON.stringify(reviews) : null,
      }

      const { error: upErr } = await supabase
        .from('destinations')
        .update(update as any)
        .eq('slug', row.slug)

      if (upErr) {
        console.error('Update failed for', row.slug, upErr.message)
      } else {
        console.log('Enriched', row.slug)
      }
    } catch (e: any) {
      console.warn('Row failed', row.slug, e?.message)
    }
  }

  console.log('Done')
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})

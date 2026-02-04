import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('Missing GOOGLE_API_KEY in environment');
  process.exit(1);
}

interface CsvRow {
  name: string;
  url?: string;
  slug?: string;
}

interface ResolvedRow extends CsvRow {
  placeId?: string | null;
  city?: string | null;
  country?: string | null;
  formattedAddress?: string | null;
}

function parseCsvLine(line: string): string[] {
  // Simple CSV split that handles basic commas; CSV provided is simple
  // Trim BOM from first line if present
  const cleaned = line.replace(/^\uFEFF/, '');
  const parts = cleaned.split(',');
  return parts.map((p) => p.trim());
}

async function findPlaceId(query: string): Promise<string | null> {
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY!,
        'X-Goog-FieldMask': 'places.id,places.displayName',
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1, languageCode: 'en' }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const id = data?.places?.[0]?.id;
    return id || null;
  } catch {
    return null;
  }
}

async function getPlaceDetails(placeId: string): Promise<any | null> {
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY!,
        'X-Goog-FieldMask': [
          'formattedAddress',
          'addressComponents',
          'location',
          'displayName',
        ].join(','),
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function extractCityAndCountry(details: any): { city: string | null; country: string | null } {
  // Try addressComponents first
  const comps: Array<{ longText: string; shortText: string; types: string[] }> =
    details?.addressComponents || [];
  let city: string | null = null;
  let country: string | null = null;

  for (const comp of comps) {
    if (comp.types?.includes('locality')) {
      city = comp.longText || comp.shortText || city;
    }
    if (comp.types?.includes('administrative_area_level_1') && !city) {
      // Fallback: use admin area as city if locality missing
      city = comp.longText || comp.shortText || city;
    }
    if (comp.types?.includes('country')) {
      country = comp.longText || comp.shortText || country;
    }
  }

  // Last resort: try to derive from formattedAddress
  if (!city && typeof details?.formattedAddress === 'string') {
    const parts = details.formattedAddress.split(',').map((p: string) => p.trim());
    if (parts.length >= 2) {
      city = parts[parts.length - 3] || parts[parts.length - 2] || null;
    }
  }

  return { city, country };
}

async function main() {
  const csvPath = process.argv[2] || '/Users/alxrhg/Downloads/softer_volumes_all_hotels.csv';
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found at: ${csvPath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headerParsed = false;
  let headers: string[] = [];
  const rows: CsvRow[] = [];

  for await (const line of rl) {
    if (!headerParsed) {
      headers = parseCsvLine(line);
      headerParsed = true;
      continue;
    }
    if (!line.trim()) continue;
    const parts = parseCsvLine(line);
    const rec: any = {};
    headers.forEach((h, idx) => (rec[h] = parts[idx] || ''));
    rows.push({ name: rec.name, url: rec.url, slug: rec.slug });
  }

  const results: ResolvedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const query = r.city ? `${r.name}, ${r.city}` : r.name;
    const placeId = await findPlaceId(query);
    if (!placeId) {
      results.push({ ...r, placeId: null, city: null, country: null, formattedAddress: null });
      await new Promise((res) => setTimeout(res, 200));
      continue;
    }
    const details = await getPlaceDetails(placeId);
    const { city, country } = extractCityAndCountry(details);
    results.push({ ...r, placeId, city: city || null, country: country || null, formattedAddress: details?.formattedAddress || null });
    // Rate limit to be safe
    await new Promise((res) => setTimeout(res, 250));
  }

  // Output CSV to stdout
  console.log(['name', 'slug', 'placeId', 'city', 'country', 'formattedAddress'].join(','));
  for (const r of results) {
    const row = [
      JSON.stringify(r.name || ''),
      JSON.stringify(r.slug || ''),
      JSON.stringify(r.placeId || ''),
      JSON.stringify(r.city || ''),
      JSON.stringify(r.country || ''),
      JSON.stringify(r.formattedAddress || ''),
    ].join(',');
    console.log(row);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


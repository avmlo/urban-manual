import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}
if (!GOOGLE_API_KEY) {
  console.error('❌ Missing GOOGLE_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface CsvRow { name: string; url?: string; slug?: string }
interface ResolvedRow extends CsvRow { placeId?: string | null; city?: string | null; country?: string | null; formattedAddress?: string | null; existsInSupabase?: boolean }

function parseCsvLine(line: string): string[] {
  const cleaned = line.replace(/^\uFEFF/, '');
  return cleaned.split(',').map((p) => p.trim());
}

function slugifyCity(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s\-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\-+/g, '-')
    .trim();
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
    return data?.places?.[0]?.id || null;
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
        'X-Goog-FieldMask': ['formattedAddress','addressComponents','displayName'].join(','),
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function extractCity(details: any): string | null {
  const comps: Array<{ longText: string; shortText: string; types: string[] }> = details?.addressComponents || [];
  for (const comp of comps) {
    if (comp.types?.includes('locality')) return comp.longText || comp.shortText || null;
  }
  // fallback from formattedAddress
  if (typeof details?.formattedAddress === 'string') {
    const parts = details.formattedAddress.split(',').map((p: string) => p.trim());
    if (parts.length >= 2) return parts[parts.length - 3] || parts[parts.length - 2] || null;
  }
  return null;
}

async function main() {
  const csvPath = process.argv[2] || '/Users/alxrhg/Downloads/softer_volumes_all_hotels.csv';
  const userId = process.argv[3] || '';

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  // Load curated city slugs from Supabase
  const { data: cityRows, error: cityErr } = await supabase
    .from('destinations')
    .select('city')
    .not('city', 'is', null);
  if (cityErr) {
    console.error('Supabase error fetching cities:', cityErr.message);
    process.exit(1);
  }
  const curatedCities = new Set(
    Array.from(new Set((cityRows || []).map((r: any) => (r.city || '').toString().trim())))
  );

  // Read CSV
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headerParsed = false;
  let headers: string[] = [];
  const rows: CsvRow[] = [];

  for await (const line of rl) {
    if (!headerParsed) { headers = parseCsvLine(line); headerParsed = true; continue; }
    if (!line.trim()) continue;
    const parts = parseCsvLine(line);
    const rec: any = {};
    headers.forEach((h, idx) => (rec[h] = parts[idx] || ''));
    rows.push({ name: rec.name, url: rec.url, slug: rec.slug });
  }

  const kept: ResolvedRow[] = [];
  const existsInSupabase: ResolvedRow[] = [];
  const notInSupabase: ResolvedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const query = r.name;
    const placeId = await findPlaceId(query);
    if (!placeId) { await new Promise((res) => setTimeout(res, 150)); continue; }
    const details = await getPlaceDetails(placeId);
    const city = details ? extractCity(details) : null;
    const citySlug = city ? slugifyCity(city) : '';

    if (city && curatedCities.has(citySlug)) {
      // Check if destination exists in Supabase by slug
      let exists = false;
      if (r.slug) {
        const { data: dest, error: dErr } = await supabase
          .from('destinations')
          .select('slug, name, city')
          .eq('slug', r.slug)
          .single();
        exists = !dErr && dest !== null;
      }

      const resolvedRow: ResolvedRow = {
        ...r,
        placeId,
        city: citySlug,
        formattedAddress: details?.formattedAddress || null,
        existsInSupabase: exists,
      };

      kept.push(resolvedRow);

      if (exists) {
        existsInSupabase.push(resolvedRow);
        // Optionally add to saved_places if user provided
        if (userId && r.slug) {
          await supabase
            .from('saved_places')
            .upsert({ user_id: userId, destination_slug: r.slug }, { onConflict: 'user_id,destination_slug' });
        }
      } else {
        notInSupabase.push(resolvedRow);
      }
    }
    await new Promise((res) => setTimeout(res, 200));
  }

  // Output all kept hotels with existence status
  console.log(['name','slug','city','placeId','formattedAddress','existsInSupabase'].join(','));
  for (const r of kept) {
    console.log([
      JSON.stringify(r.name || ''),
      JSON.stringify(r.slug || ''),
      JSON.stringify(r.city || ''),
      JSON.stringify(r.placeId || ''),
      JSON.stringify(r.formattedAddress || ''),
      JSON.stringify(r.existsInSupabase ? 'true' : 'false'),
    ].join(','));
  }

  console.error(`\n📊 Summary:`);
  console.error(`   ✅ Total in curated cities: ${kept.length} of ${rows.length}`);
  console.error(`   ✅ Exists in Supabase: ${existsInSupabase.length}`);
  console.error(`   ❌ Not in Supabase: ${notInSupabase.length}`);
  
  if (notInSupabase.length > 0) {
    console.error(`\n❌ Hotels not found in Supabase:`);
    notInSupabase.forEach(r => {
      console.error(`   - ${r.name} (${r.slug || 'no slug'})`);
    });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

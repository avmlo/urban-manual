/**
 * Enrich Destinations with Exa Web Search
 * Fetches additional information from the web using Exa and stores it in the database
 * Usage: npm run enrich:exa [--limit N] [--offset N] [--all]
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL or Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Search Exa for architect/design information about a destination
 * Searches for both architect and interior design information
 */
async function searchExaForArchitectInfo(
  name: string,
  city: string
): Promise<{
  architect?: string;
  interiorDesigner?: string;
  designFirm?: string;
  architecturalStyle?: string;
  designPeriod?: string;
  fullInfo?: any;
  sources?: Array<{ title: string; url: string; text?: string }>;
}> {
  try {
    // Build comprehensive query for both architect and interior design
    const query = `${name} architect interior design ${city}`;
    console.log(`  🏗️  Searching Exa for architect/design info: "${query}"`);
    
    const EXA_API_KEY = process.env.EXA_API_KEY;
    if (EXA_API_KEY) {
      // Search with autoprompt to get better results for both architect and interior design
      const response = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': EXA_API_KEY,
        },
        body: JSON.stringify({
          query,
          num_results: 8, // Increased to get more comprehensive results
          use_autoprompt: true,
          contents: {
            text: true,
            highlights: true,
          },
          // Add category hints to improve relevance
          category: 'architecture,design,interior',
        }),
      });

      if (!response.ok) {
        throw new Error(`Exa API error: ${response.statusText}`);
      }

      const data = await response.json();
      const results = data.results || [];
      
      // Extract architect/design info from results
      // This will look for both architect and interior designer information
      const extracted = extractArchitectInfo(results);
      
      console.log(`  📊 Found ${results.length} web results, extracted:`, {
        architect: extracted.architect ? '✓' : '✗',
        interiorDesigner: extracted.interiorDesigner ? '✓' : '✗',
        designFirm: extracted.designFirm ? '✓' : '✗',
        style: extracted.architecturalStyle ? '✓' : '✗',
        period: extracted.designPeriod ? '✓' : '✗',
      });
      
      return {
        ...extracted,
        sources: results.map((r: any) => ({
          title: r.title || '',
          url: r.url || '',
          text: r.text || '',
        })),
        fullInfo: results,
      };
    }
    
    console.warn(`  ⚠️  No EXA_API_KEY found. Please configure Exa MCP or set EXA_API_KEY in .env.local`);
    return {};
    
  } catch (error: any) {
    console.error(`  ❌ Exa architect search error: ${error.message}`);
    return {};
  }
}

/**
 * Extract architect/design information from Exa search results
 * Uses general patterns to extract any designer/architect/firm information
 */
function extractArchitectInfo(results: any[]): {
  architect?: string;
  interiorDesigner?: string;
  designFirm?: string;
  architecturalStyle?: string;
  designPeriod?: string;
} {
  const extracted: any = {};
  
  // Combine all text from results for pattern matching
  const combinedText = results.map(r => (r.text || r.title || '')).join(' ');
  const lowerText = combinedText.toLowerCase();
  
  // General designer/architect patterns - catch any name associated with design/architecture
  const generalDesignerPatterns = [
    /(?:designed|design) by ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+[A-Z][a-z]+)?)/i,
    /(?:architect|designer|interior designer)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+[A-Z][a-z]+)?)/i,
    /by ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+[A-Z][a-z]+)?)\s+(?:architect|designer|design|studio)/i,
  ];
  
  // Try to extract any designer/architect name (general)
  for (const pattern of generalDesignerPatterns) {
    const matches = combinedText.match(pattern);
    if (matches && matches[1]) {
      const name = matches[1].trim();
      if (name.length > 2) {
        // Use as architect if not already set, or as designer if architect is set
        if (!extracted.architect) {
          extracted.architect = name;
        } else if (!extracted.interiorDesigner) {
          extracted.interiorDesigner = name;
        }
        break;
      }
    }
  }
  
  // Design firm/studio patterns (general)
  const firmPatterns = [
    /(?:by|from|designed by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:studio|firm|architects|design|associates|partners)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:architects|design studio|design firm|architecture studio|interior design)/i,
  ];
  
  for (const pattern of firmPatterns) {
    const matches = combinedText.match(pattern);
    if (matches && matches[1]) {
      const firm = matches[1].trim();
      if (firm && firm.length > 2) {
        extracted.designFirm = firm;
        break;
      }
    }
  }
  
  // Architectural style (general - just catch common styles)
  const stylePatterns = [
    /(modernist|brutalist|contemporary|minimalist|art deco|bauhaus|postmodern|neoclassical|mid-century|scandinavian|japanese|industrial)/i,
  ];
  
  for (const pattern of stylePatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      extracted.architecturalStyle = match[1].trim();
      break;
    }
  }
  
  // Design period (general - just catch decades)
  const periodPatterns = [
    /(19\d{2}s|20\d{2}s|1960s|1970s|1980s|1990s|2000s|2010s|2020s)/i,
    /(?:built|designed|completed)\s+(?:in\s+)?(19\d{2}|20\d{2})/i,
  ];
  
  for (const pattern of periodPatterns) {
    const match = lowerText.match(pattern);
    if (match && match[1]) {
      extracted.designPeriod = match[1].trim();
      break;
    }
  }
  
  // Deduplicate: if architect and designFirm are similar (e.g., "Bla Bla" and "Bla Bla Studio"), prefer the studio name
  if (extracted.architect && extracted.designFirm) {
    const architectLower = extracted.architect.toLowerCase();
    const firmLower = extracted.designFirm.toLowerCase();
    
    // Check if one contains the other
    if (firmLower.includes(architectLower) || architectLower.includes(firmLower)) {
      // Prefer the studio/firm name (usually longer, contains "Studio"/"Firm"/etc)
      if (extracted.designFirm.length >= extracted.architect.length || 
          firmLower.includes('studio') || firmLower.includes('firm') || firmLower.includes('architects')) {
        extracted.architect = undefined; // Remove the individual name, keep the studio
      } else {
        extracted.designFirm = undefined; // Keep the architect name if it's actually longer
      }
    }
  }
  
  // Also check architect vs interiorDesigner
  if (extracted.architect && extracted.interiorDesigner) {
    const architectLower = extracted.architect.toLowerCase();
    const designerLower = extracted.interiorDesigner.toLowerCase();
    
    if (architectLower === designerLower || 
        (architectLower.includes(designerLower) && architectLower.length - designerLower.length < 5) ||
        (designerLower.includes(architectLower) && designerLower.length - architectLower.length < 5)) {
      // They're the same or very similar, keep architect
      extracted.interiorDesigner = undefined;
    }
  }
  
  return extracted;
}

/**
 * Search Exa for general information about a destination
 */
async function searchExaForDestination(
  name: string,
  city: string,
  category?: string
): Promise<{
  title: string;
  url: string;
  text?: string;
  score?: number;
  publishedDate?: string;
}[]> {
  try {
    // Build search query
    const query = category 
      ? `${name} ${category} ${city}`
      : `${name} ${city}`;

    console.log(`  🔍 Searching Exa for: "${query}"`);
    
    // NOTE: Since you have Exa MCP configured locally, you'll need to call it here
    // The exact implementation depends on how your MCP is set up
    // 
    // Option 1: If using MCP through a Node.js client:
    // const { ExaClient } = require('@exa-ai/sdk');
    // const exa = new ExaClient({ apiKey: process.env.EXA_API_KEY });
    // const results = await exa.search({ query, numResults: 5 });
    //
    // Option 2: If using MCP through HTTP/API:
    // const response = await fetch('http://localhost:PORT/mcp/exa/search', {
    //   method: 'POST',
    //   body: JSON.stringify({ query, num_results: 5 })
    // });
    // const results = await response.json();
    //
    // Option 3: Direct API call (if you have EXA_API_KEY):
    const EXA_API_KEY = process.env.EXA_API_KEY;
    if (EXA_API_KEY) {
      const response = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': EXA_API_KEY,
        },
        body: JSON.stringify({
          query,
          num_results: 5,
          use_autoprompt: true,
          contents: {
            text: true,
            highlights: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Exa API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.results || []).map((result: any) => ({
        title: result.title || '',
        url: result.url || '',
        text: result.text || '',
        score: result.score,
        publishedDate: result.published_date,
      }));
    }
    
    // If no API key and MCP not configured, return empty
    console.warn(`  ⚠️  No EXA_API_KEY found. Please configure Exa MCP or set EXA_API_KEY in .env.local`);
    return [];
    
  } catch (error: any) {
    console.error(`  ❌ Exa search error: ${error.message}`);
    return [];
  }
}

/**
 * Enrich a single destination with Exa web search data
 */
async function enrichDestinationWithExa(dest: any): Promise<{
  slug: string;
  ok: boolean;
  error?: string;
  architectInfo?: any;
  webResults?: any[];
}> {
  try {
    console.log(`\n📝 Enriching: ${dest.name} (${dest.city})`);

    // Search for architect/design information first
    const architectInfo = await searchExaForArchitectInfo(dest.name, dest.city);
    
    // Search for general web content
    const webResults = await searchExaForDestination(
      dest.name,
      dest.city,
      dest.category
    );

    // Prepare update data - only use columns that exist
    const updateData: any = {};

    // Add architect/design info if found
    // Map to existing fields where possible to avoid duplicates
    // Update if we found ANY architect/design information (not just all)
    if (architectInfo.architect || architectInfo.interiorDesigner || architectInfo.designFirm || 
        architectInfo.architecturalStyle || architectInfo.designPeriod || architectInfo.sources?.length > 0) {
      // Use existing fields: architect, architectural_style, designer_name
      if (architectInfo.architect) {
        updateData.design_firm = architectInfo.architect;
      }
      if (architectInfo.interiorDesigner) {
        updateData.designer_name = architectInfo.interiorDesigner; // Map to existing field
      }
      if (architectInfo.architecturalStyle) {
        updateData.architectural_style = architectInfo.architecturalStyle; // Use existing
      }
      
      console.log(`  🏗️  Found architect/design info:`, {
        architect: architectInfo.architect || 'not found',
        interiorDesigner: architectInfo.interiorDesigner || 'not found', // mapped to designer_name
        designFirm: architectInfo.designFirm || 'not found',
        style: architectInfo.architecturalStyle || 'not found',
        period: architectInfo.designPeriod || 'not found',
        sources: architectInfo.sources?.length || 0,
      });
    }

    // Only update if we found something
    if (Object.keys(updateData).length === 0) {
      return {
        slug: dest.slug,
        ok: false,
        error: 'No enrichment data found',
      };
    }

    // Update database with only existing columns
    const { error: updateError } = await supabase
      .from('destinations')
      .update(updateData)
      .eq('slug', dest.slug);

    if (updateError) {
      // If error is about missing columns, try without them
      if (updateError.message?.includes('column') || updateError.message?.includes('does not exist')) {
        console.log('  ⚠️  Some columns may not exist yet. Using basic fields only.');
        // Filter out columns that might not exist
        const basicUpdate: any = {};
        if (updateData.design_firm) basicUpdate.design_firm = updateData.design_firm;
        if (updateData.designer_name) basicUpdate.designer_name = updateData.designer_name;
        if (updateData.architectural_style) basicUpdate.architectural_style = updateData.architectural_style;
        
        const { error: basicError } = await supabase
          .from('destinations')
          .update(basicUpdate)
          .eq('slug', dest.slug);
        
        if (basicError) {
          throw basicError;
        }
      } else {
        throw updateError;
      }
    }

    console.log(`  ✅ Enrichment complete`);
    return {
      slug: dest.slug,
      ok: true,
      architectInfo,
      webResults,
    };
  } catch (error: any) {
    console.error(`  ❌ Error: ${error.message}`);
    return {
      slug: dest.slug,
      ok: false,
      error: error.message,
    };
  }
}

/**
 * Main enrichment function
 */
async function main() {
  const args = process.argv.slice(2);
  const enrichAll = args.includes('--all');
  const limitIndex = args.findIndex(arg => arg === '--limit');
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : (enrichAll ? undefined : 10);
  const offsetIndex = args.findIndex(arg => arg === '--offset');
  const offset = offsetIndex >= 0 ? parseInt(args[offsetIndex + 1]) : 0;

  console.log('🚀 Starting Exa enrichment...\n');

  // Fetch destinations
  // Note: Select only columns that exist (migration 027 may not be applied yet)
  let query = supabase
    .from('destinations')
    .select('slug, name, city, category, design_firm, designer_name, architectural_style')
    .is('parent_destination_id', null) // Only top-level destinations
    .order('name', { ascending: true });
  
  // Try to select new columns if they exist (graceful fallback)
  try {
    const testQuery = supabase.from('destinations').select('architect_info_json').limit(1);
    // If this doesn't error, columns exist - we can use them
  } catch {
    // Columns don't exist yet - will use basic fields only
  }

  if (!enrichAll) {
    // Only enrich destinations that haven't been enriched yet
    query = query
      .is('design_firm', null)
      .is('designer_name', null)
      .is('architectural_style', null);
  } else {
    // When enriching all, still skip ones that already have architect info
    query = query
      .is('design_firm', null)
      .is('designer_name', null)
      .is('architectural_style', null);
  }

  if (limit) {
    query = query.limit(limit);
  }

  if (offset) {
    query = query.range(offset, offset + (limit || 1000) - 1);
  }

  const { data: destinations, error } = await query;

  if (error) {
    console.error('❌ Error fetching destinations:', error);
    process.exit(1);
  }

  if (!destinations || destinations.length === 0) {
    console.log('✅ No destinations to enrich!');
    process.exit(0);
  }

  console.log(`📊 Found ${destinations.length} destinations to enrich\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i];
    const progress = `[${i + 1}/${destinations.length}]`;

    const result = await enrichDestinationWithExa(dest);

    if (result.ok) {
      successCount++;
    } else {
      errorCount++;
      console.log(`  ${progress} ❌ Failed: ${result.error}`);
    }

    // Rate limiting - wait 1 second between requests to avoid overwhelming Exa
    if (i < destinations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n📈 Enrichment Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total: ${destinations.length}`);
}

main().catch(console.error);


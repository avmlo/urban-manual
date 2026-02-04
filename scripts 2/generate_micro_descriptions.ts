import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY environment variables.');
  process.exit(1);
}

if (!geminiApiKey) {
  console.error('❌ Missing Gemini API key. Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

/**
 * Generate a micro description (50-100 characters) for a destination
 * This is a short, punchy one-liner perfect for card displays
 * Must fit on ONE line and will be truncated with ellipsis if too long
 */
async function generateMicroDescription(
  name: string,
  city: string,
  category: string,
  description?: string | null,
  michelinStars?: number | null
): Promise<string | null> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
  
  const context = `
Destination Name: ${name}
City: ${city}
Category: ${category}
${michelinStars ? `Michelin Stars: ${michelinStars}` : ''}
${description ? `Description: ${description.substring(0, 300)}` : ''}
`.trim();

  const prompt = `Generate a concise micro description for this destination.

${context}

Requirements:
- 50-100 characters maximum (must fit on ONE line)
- Editorial, story-driven tone
- Engaging and memorable
- Captures the essence of what makes this place special
- No punctuation at the end (unless it's part of the description)
- Focus on atmosphere, uniqueness, or key appeal
- Must be a single sentence that fits on one line when displayed
- Will be truncated with "..." if longer than 100 characters

Examples:
- "Refined Japanese dining meets tradition in a minimalist setting"
- "Cozy neighborhood cafe with artisan pastries and excellent coffee"
- "Modern luxury hotel overlooking the harbor with impeccable service"
- "Hidden speakeasy bar with craft cocktails and intimate vibes"
- "Contemporary art gallery showcasing emerging local talent"

Micro description:`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();
    
    // Remove quotes if present
    text = text.replace(/^["']|["']$/g, '');
    
    // Remove any newlines to ensure single line
    text = text.replace(/\n/g, ' ').trim();
    
    // Ensure it's within character limit (max 100 chars for single line)
    // Truncate to 97 chars and add ellipsis if needed
    if (text.length > 100) {
      text = text.substring(0, 97).trim() + '...';
    }
    
    return text;
  } catch (error) {
    console.error(`Error generating micro description:`, error);
    return null;
  }
}

interface Destination {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  description?: string | null;
  content?: string | null;
  michelin_stars?: number | null;
  micro_description?: string | null;
}

async function updateMicroDescriptions() {
  console.log('🚀 Starting micro description generation...\n');

  // Fetch all destinations that don't have micro_description or need regeneration
  const { data: destinations, error } = await supabase
    .from('destinations')
    .select('id, slug, name, city, category, description, content, michelin_stars, micro_description')
    .order('id');

  if (error) {
    console.error('❌ Error fetching destinations:', error);
    return;
  }

  if (!destinations || destinations.length === 0) {
    console.log('❌ No destinations found!');
    return;
  }

  // Filter destinations that need micro descriptions
  const destinationsToProcess = destinations.filter((d: Destination) => 
    !d.micro_description || d.micro_description.trim() === ''
  ) as Destination[];

  console.log(`📊 Found ${destinations.length} total destinations`);
  console.log(`📝 ${destinationsToProcess.length} need micro descriptions\n`);

  if (destinationsToProcess.length === 0) {
    console.log('✅ All destinations already have micro descriptions!');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < destinationsToProcess.length; i++) {
    const dest = destinationsToProcess[i];
    
    try {
      console.log(`[${i + 1}/${destinationsToProcess.length}] Generating for: ${dest.name} (${dest.slug})`);
      
      const microDesc = await generateMicroDescription(
        dest.name,
        dest.city,
        dest.category,
        dest.description || dest.content,
        dest.michelin_stars
      );
      
      if (microDesc) {
        // Update in Supabase
        const { error: updateError } = await supabase
          .from('destinations')
          .update({ micro_description: microDesc })
          .eq('id', dest.id);

        if (updateError) {
          console.error(`  ❌ Error updating:`, updateError.message);
          failCount++;
        } else {
          console.log(`  ✅ Generated: "${microDesc}"`);
          successCount++;
        }
      } else {
        console.log(`  ⚠️  Failed to generate micro description`);
        failCount++;
      }

      // Rate limiting - wait 1 second between requests to avoid hitting API limits
      if (i < destinationsToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      console.error(`  ❌ Error processing ${dest.name}:`, error?.message || error);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${destinationsToProcess.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('✅ Done!');
}

// Run the script
updateMicroDescriptions().catch(console.error);


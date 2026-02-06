/**
 * Check Exa Enrichment Progress
 * Shows how many destinations have been enriched with architect/design info
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase URL or Key not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkProgress() {
  try {
    console.log('📊 Checking Exa Enrichment Progress...\n');

    // Get total destinations
    const { count: totalCount } = await supabase
      .from('destinations')
      .select('*', { count: 'exact', head: true })
      .is('parent_destination_id', null);

    // Get destinations with architect info
    const { count: architectCount } = await supabase
      .from('destinations')
      .select('*', { count: 'exact', head: true })
      .is('parent_destination_id', null)
      .not('design_firm', 'is', null);

    // Get destinations with designer name
    const { count: designerCount } = await supabase
      .from('destinations')
      .select('*', { count: 'exact', head: true })
      .is('parent_destination_id', null)
      .not('designer_name', 'is', null);

    // Get destinations with architectural style
    const { count: styleCount } = await supabase
      .from('destinations')
      .select('*', { count: 'exact', head: true })
      .is('parent_destination_id', null)
      .not('architectural_style', 'is', null);

    // Get destinations with any architect/design info
    const { count: anyInfoCount } = await supabase
      .from('destinations')
      .select('*', { count: 'exact', head: true })
      .is('parent_destination_id', null)
      .or('design_firm.not.is.null,designer_name.not.is.null,architectural_style.not.is.null');

    // Get some recent examples (sorted by name to see variety)
    const { data: recentExamples } = await supabase
      .from('destinations')
      .select('name, city, design_firm, designer_name, architectural_style')
      .is('parent_destination_id', null)
      .or('design_firm.not.is.null,designer_name.not.is.null,architectural_style.not.is.null')
      .order('name', { ascending: false })
      .limit(10);
    
    // Get a sample of destinations without architect info (to see what's pending)
    const { data: pendingSample } = await supabase
      .from('destinations')
      .select('name, city')
      .is('parent_destination_id', null)
      .is('design_firm', null)
      .is('designer_name', null)
      .is('architectural_style', null)
      .limit(5);

    console.log('📈 Enrichment Statistics:\n');
    console.log(`   Total destinations: ${totalCount || 0}`);
    console.log(`   With architect info: ${architectCount || 0} (${totalCount ? ((architectCount || 0) / totalCount * 100).toFixed(1) : 0}%)`);
    console.log(`   With designer name: ${designerCount || 0} (${totalCount ? ((designerCount || 0) / totalCount * 100).toFixed(1) : 0}%)`);
    console.log(`   With architectural style: ${styleCount || 0} (${totalCount ? ((styleCount || 0) / totalCount * 100).toFixed(1) : 0}%)`);
    console.log(`   With any architect/design info: ${anyInfoCount || 0} (${totalCount ? ((anyInfoCount || 0) / totalCount * 100).toFixed(1) : 0}%)`);
    console.log(`   Remaining: ${(totalCount || 0) - (anyInfoCount || 0)}`);

    if (recentExamples && recentExamples.length > 0) {
      console.log('\n📝 Recent Examples (Enriched):\n');
      recentExamples.slice(0, 5).forEach((dest: any) => {
        console.log(`   • ${dest.name} (${dest.city})`);
        if (dest.design_firm) console.log(`     Design Firm: ${dest.design_firm}`);
        if (dest.designer_name) console.log(`     Designer: ${dest.designer_name}`);
        if (dest.architectural_style) console.log(`     Style: ${dest.architectural_style}`);
      });
    }

    if (pendingSample && pendingSample.length > 0) {
      console.log('\n⏳ Sample Pending Destinations:\n');
      pendingSample.forEach((dest: any) => {
        console.log(`   • ${dest.name} (${dest.city})`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error checking progress:', error.message);
  }
}

checkProgress().catch(console.error);


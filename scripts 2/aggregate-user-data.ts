/**
 * Aggregate user interactions for ML models
 * 
 * This script can be run manually or via cron.
 * Aggregates user interaction data and prepares it for ML model training.
 * 
 * Usage:
 *   npm run aggregate:user-data
 *   or
 *   tsx scripts/aggregate-user-data.ts
 */

import { createServiceRoleClient } from '@/lib/supabase-server';

async function aggregateUserInteractions() {
  console.log('Starting user data aggregation...');

  const supabase = createServiceRoleClient();

  if (!supabase) {
    console.error('Supabase service role client not available');
    process.exit(1);
  }

  try {
    // Aggregate views, saves, visits by destination
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get interaction counts by destination
    const { data: interactions, error: interactionsError } = await supabase
      .from('user_interactions')
      .select('destination_id, interaction_type')
      .gte('created_at', thirtyDaysAgo);

    if (interactionsError) {
      throw new Error(`Failed to fetch interactions: ${interactionsError.message}`);
    }

    // Aggregate by destination
    const destinationStats: Record<number, { views: number; saves: number; clicks: number }> = {};

    (interactions || []).forEach((interaction: any) => {
      if (!interaction.destination_id) return;

      if (!destinationStats[interaction.destination_id]) {
        destinationStats[interaction.destination_id] = { views: 0, saves: 0, clicks: 0 };
      }

      if (interaction.interaction_type === 'view') {
        destinationStats[interaction.destination_id].views++;
      } else if (interaction.interaction_type === 'save') {
        destinationStats[interaction.destination_id].saves++;
      } else if (interaction.interaction_type === 'click') {
        destinationStats[interaction.destination_id].clicks++;
      }
    });

    // Update destinations with aggregated stats
    let updated = 0;
    for (const [destId, stats] of Object.entries(destinationStats)) {
      const { error } = await supabase
        .from('destinations')
        .update({
          views_count: stats.views,
          saves_count: stats.saves,
        })
        .eq('id', parseInt(destId));

      if (!error) {
        updated++;
      }
    }

    console.log(`✅ Aggregated interactions for ${updated} destinations`);
    console.log(`   Total interactions: ${interactions?.length || 0}`);
    console.log(`   Unique destinations: ${Object.keys(destinationStats).length}`);

    // Get visit counts
    const { data: visits, error: visitsError } = await supabase
      .from('visited_places')
      .select('destination_slug')
      .gte('visited_at', thirtyDaysAgo);

    if (!visitsError && visits) {
      const visitCounts: Record<string, number> = {};
      visits.forEach((visit: any) => {
        if (visit.destination_slug) {
          visitCounts[visit.destination_slug] = (visitCounts[visit.destination_slug] || 0) + 1;
        }
      });

      let visitsUpdated = 0;
      for (const [slug, count] of Object.entries(visitCounts)) {
        const { error } = await supabase
          .from('destinations')
          .update({ visits_count: count })
          .eq('slug', slug);

        if (!error) {
          visitsUpdated++;
        }
      }

      console.log(`✅ Updated visit counts for ${visitsUpdated} destinations`);
    }

    console.log('✅ User data aggregation complete!');
    return { success: true, updated };

  } catch (error: any) {
    console.error('❌ Error aggregating user data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  aggregateUserInteractions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { aggregateUserInteractions };


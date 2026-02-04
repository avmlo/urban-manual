/**
 * Generate SQL UPDATE statements to add coordinates to existing destinations
 * This bypasses all import/RLS issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DESTINATIONS_FILE = path.join(__dirname, 'public', 'destinations.json');
const SQL_OUTPUT = path.join(__dirname, 'update_coordinates.sql');

function escapeSQLString(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function generateSQL() {
  console.log('📦 Reading destinations...\n');
  
  const destinationsData = JSON.parse(fs.readFileSync(DESTINATIONS_FILE, 'utf8'));
  console.log(`✅ Found ${destinationsData.length} destinations\n`);

  let sql = `-- ============================================
-- UPDATE COORDINATES FOR EXISTING DESTINATIONS
-- ============================================
-- This script updates lat/long for all destinations
-- Run this in Supabase SQL Editor
-- ============================================

`;

  let updated = 0;
  let skipped = 0;

  for (const dest of destinationsData) {
    if (!dest.slug || dest.slug === '') {
      skipped++;
      continue;
    }

    if (dest.lat && dest.long && (dest.lat !== 0 || dest.long !== 0)) {
      sql += `UPDATE destinations SET lat = ${dest.lat}, long = ${dest.long} WHERE slug = ${escapeSQLString(dest.slug)};\n`;
      updated++;
    }
  }

  sql += `\n-- ============================================\n`;
  sql += `-- SUMMARY\n`;
  sql += `-- ============================================\n`;
  sql += `-- Updated: ${updated} destinations with coordinates\n`;
  sql += `-- Skipped: ${skipped} destinations (no slug or no coordinates)\n`;
  sql += `-- ============================================\n\n`;

  sql += `-- Verify the updates\n`;
  sql += `SELECT COUNT(*) as total, COUNT(CASE WHEN lat != 0 THEN 1 END) as with_coords FROM destinations;\n\n`;

  sql += `-- Update location column for PostGIS\n`;
  sql += `UPDATE destinations \n`;
  sql += `SET location = ST_SetSRID(ST_MakePoint(long, lat), 4326)\n`;
  sql += `WHERE lat != 0 AND long != 0;\n\n`;

  sql += `DO $$\n`;
  sql += `BEGIN\n`;
  sql += `  RAISE NOTICE '✅ Coordinates updated for ${updated} destinations!';\n`;
  sql += `  RAISE NOTICE '';\n`;
  sql += `  RAISE NOTICE 'Next: Test search and location features';\n`;
  sql += `END $$;\n`;

  fs.writeFileSync(SQL_OUTPUT, sql);
  
  console.log('✅ SQL script generated!\n');
  console.log(`📄 File: ${SQL_OUTPUT}`);
  console.log(`📊 Updates: ${updated} destinations`);
  console.log(`⏭️  Skipped: ${skipped} destinations\n`);
  console.log('Next steps:');
  console.log('1. Go to Supabase SQL Editor');
  console.log('2. Copy contents of update_coordinates.sql');
  console.log('3. Paste and click "Run"');
  console.log('4. Wait ~10 seconds for updates to complete\n');
}

generateSQL();


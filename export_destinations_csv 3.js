/**
 * Export destinations to CSV for Supabase dashboard import
 * This bypasses RLS issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DESTINATIONS_FILE = path.join(__dirname, 'public', 'destinations.json');
const CSV_OUTPUT = path.join(__dirname, 'destinations_import.csv');

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportToCSV() {
  console.log('📦 Reading destinations...\n');
  
  const destinationsData = JSON.parse(fs.readFileSync(DESTINATIONS_FILE, 'utf8'));
  console.log(`✅ Found ${destinationsData.length} destinations\n`);

  // CSV header
  const headers = [
    'slug',
    'name',
    'city',
    'category',
    'content',
    'subline',
    'main_image',
    'michelin_stars',
    'crown',
    'lat',
    'long'
  ];

  let csv = headers.join(',') + '\n';

  // Add each destination
  for (const dest of destinationsData) {
    const row = [
      escapeCSV(dest.slug),
      escapeCSV(dest.name),
      escapeCSV(dest.city || ''),
      escapeCSV(dest.category || ''),
      escapeCSV(dest.content || ''),
      escapeCSV(dest.subline || ''),
      escapeCSV(dest.mainImage || ''),
      dest.michelinStars || 0,
      dest.crown ? 'true' : 'false',
      dest.lat || 0,
      dest.long || 0
    ];
    csv += row.join(',') + '\n';
  }

  fs.writeFileSync(CSV_OUTPUT, csv);
  
  console.log('✅ CSV export complete!\n');
  console.log(`📄 File: ${CSV_OUTPUT}`);
  console.log(`📊 Rows: ${destinationsData.length}\n`);
  console.log('Next steps:');
  console.log('1. Go to Supabase Dashboard');
  console.log('2. Click "Table Editor" → "destinations"');
  console.log('3. Click "Insert" → "Import data from CSV"');
  console.log('4. Upload destinations_import.csv');
  console.log('5. Map columns and import\n');
}

exportToCSV();


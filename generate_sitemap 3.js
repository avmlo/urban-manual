/**
 * Generate XML sitemap for Urban Manual
 * Includes all destinations, cities, and static pages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DESTINATIONS_FILE = path.join(__dirname, 'public', 'destinations.json');
const SITEMAP_OUTPUT = path.join(__dirname, 'public', 'sitemap.xml');
const BASE_URL = 'https://www.urbanmanual.co';

function generateSitemap() {
  console.log('🗺️  Generating sitemap...\n');
  
  // Read destinations
  const destinations = JSON.parse(fs.readFileSync(DESTINATIONS_FILE, 'utf8'));
  
  // Get unique cities
  const cities = [...new Set(destinations.map(d => d.city).filter(Boolean))];
  
  // Start XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Static pages
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/cities', priority: '0.9', changefreq: 'weekly' },
    { url: '/explore', priority: '0.8', changefreq: 'weekly' },
    { url: '/editorial', priority: '0.7', changefreq: 'weekly' },
    { url: '/account', priority: '0.6', changefreq: 'monthly' },
    { url: '/privacy', priority: '0.5', changefreq: 'yearly' },
  ];
  
  staticPages.forEach(page => {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  });
  
  // City pages
  cities.forEach(city => {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}/city/${city}</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += '  </url>\n';
  });
  
  // Destination pages
  destinations.forEach(dest => {
    if (dest.slug && dest.slug !== '') {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/destination/${dest.slug}</loc>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += '  </url>\n';
    }
  });
  
  // Close XML
  xml += '</urlset>\n';
  
  // Write file
  fs.writeFileSync(SITEMAP_OUTPUT, xml);
  
  console.log('✅ Sitemap generated!\n');
  console.log(`📄 File: ${SITEMAP_OUTPUT}`);
  console.log(`📊 URLs: ${staticPages.length + cities.length + destinations.filter(d => d.slug).length}`);
  console.log(`   - Static pages: ${staticPages.length}`);
  console.log(`   - City pages: ${cities.length}`);
  console.log(`   - Destination pages: ${destinations.filter(d => d.slug).length}\n`);
  console.log(`🌐 Sitemap URL: ${BASE_URL}/sitemap.xml\n`);
  console.log('Next steps:');
  console.log('1. Commit and push sitemap.xml');
  console.log('2. Submit to Google Search Console');
  console.log('3. Add to robots.txt\n');
}

generateSitemap();


import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';

export async function GET() {
  try {
    // Fetch recent destinations (limit to 50)
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('slug, name, city, category, description, content, image')
      .order('name', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching destinations for RSS:', error);
      return new Response('Error generating RSS feed', { status: 500 });
    }

    const baseUrl = 'https://www.urbanmanual.co';
    const buildDate = new Date().toUTCString();

    // Generate RSS XML
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>The Urban Manual</title>
    <link>${baseUrl}</link>
    <description>Curated guide to world's best hotels, restaurants &amp; travel destinations</description>
    <language>en</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>The Urban Manual</title>
      <link>${baseUrl}</link>
    </image>
${(destinations || []).map((dest: Destination) => {
  const cityName = dest.city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const title = `${dest.name} - ${dest.category} in ${cityName}`;
  const link = `${baseUrl}/destination/${dest.slug}`;
  const pubDate = buildDate; // Use build date for all items

  // Clean description
  let description = '';
  if (dest.content) {
    description = dest.content
      .replace(/<[^>]*>/g, '')
      .substring(0, 300)
      .trim();
    if (dest.content.length > 300) {
      description += '...';
    }
  } else if (dest.description) {
    description = dest.description;
  } else {
    description = `Discover ${dest.name}, a ${dest.category.toLowerCase()} in ${cityName}. Curated by The Urban Manual.`;
  }

  // Escape XML special characters
  const escapeXml = (str: string) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(dest.category)}</category>
      <dc:creator>The Urban Manual</dc:creator>
      ${dest.image ? `<enclosure url="${dest.image}" type="image/jpeg"/>` : ''}
    </item>`;
}).join('\n')}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new Response('Error generating RSS feed', { status: 500 });
  }
}

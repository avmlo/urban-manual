import { Metadata } from 'next';
import { createServerClient } from './supabase-server';
import { Destination } from '@/types/destination';

/**
 * Generate SEO-optimized metadata for destination pages
 */
export async function generateDestinationMetadata(slug: string): Promise<Metadata> {
  try {
    const supabase = await createServerClient();
    const { data: destination, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !destination) {
      return {
        title: 'Destination Not Found | The Urban Manual',
        description: 'The destination you are looking for could not be found.',
      };
    }

    const dest = destination as Destination;

    // Generate title
    const title = `${dest.name} - ${dest.category} in ${dest.city} | The Urban Manual`;

    // Generate description
    let description = '';
    if (dest.content) {
      // Strip HTML and limit to 155 characters
      description = dest.content
        .replace(/<[^>]*>/g, '')
        .substring(0, 155)
        .trim();
      if (dest.content.length > 155) {
        description += '...';
      }
    } else {
      // Fallback description
      description = `Discover ${dest.name}, a ${dest.category.toLowerCase()} in ${dest.city}`;
      if (dest.michelin_stars && dest.michelin_stars > 0) {
        description += `. ${dest.michelin_stars} Michelin star${dest.michelin_stars > 1 ? 's' : ''}`;
      }
      description += '. Curated by The Urban Manual.';
    }

    // Generate canonical URL
    const canonicalUrl = `https://www.urbanmanual.co/destination/${slug}`;

    // Generate Open Graph image
    const ogImage = dest.image || 'https://www.urbanmanual.co/og-default.jpg';

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: 'The Urban Manual',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: dest.name,
          },
        ],
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'The Urban Manual',
      description: 'Your guide to the world\'s best destinations',
    };
  }
}

/**
 * Generate SEO-optimized metadata for city pages
 */
export async function generateCityMetadata(city: string): Promise<Metadata> {
  const formattedCity = decodeURIComponent(city);
  const title = `Best Hotels & Restaurants in ${formattedCity} | The Urban Manual`;
  const description = `Discover the finest hotels, Michelin-starred restaurants, cafes, and hidden gems in ${formattedCity}. Curated by The Urban Manual.`;
  const canonicalUrl = `https://www.urbanmanual.co/city/${encodeURIComponent(city)}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'The Urban Manual',
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

/**
 * Generate structured data (Schema.org JSON-LD) for destinations
 */
export function generateDestinationSchema(destination: Destination) {
  const baseSchema = {
    '@context': 'https://schema.org',
    name: destination.name,
    description: destination.content?.replace(/<[^>]*>/g, ''),
    image: destination.image,
    url: `https://www.urbanmanual.co/destination/${destination.slug}`,
  };

  // Determine schema type based on category
  const category = destination.category?.toLowerCase() || '';

  if (category === 'hotel') {
    return {
      ...baseSchema,
      '@type': 'Hotel',
      address: {
        '@type': 'PostalAddress',
        addressLocality: destination.city,
        addressCountry: destination.country,
      },
      starRating: destination.rating
        ? {
            '@type': 'Rating',
            ratingValue: destination.rating,
            bestRating: 5,
          }
        : undefined,
      priceRange: '$'.repeat(destination.price_level || 2),
    };
  } else if (['restaurant', 'Restaurant', 'cafe', 'bar'].includes(category)) {
    const restaurantSchema: any = {
      ...baseSchema,
      '@type': 'Restaurant',
      address: {
        '@type': 'PostalAddress',
        addressLocality: destination.city,
        addressCountry: destination.country,
      },
      servesCuisine: destination.tags?.join(', '),
      priceRange: '$'.repeat(destination.price_level || 2),
    };

    // Add Michelin stars if available
    if (destination.michelin_stars && destination.michelin_stars > 0) {
      restaurantSchema.award = `${destination.michelin_stars} Michelin Star${
        destination.michelin_stars > 1 ? 's' : ''
      }`;
    }

    // Add rating if available
    if (destination.rating) {
      restaurantSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: destination.rating,
        bestRating: 5,
      };
    }

    return restaurantSchema;
  } else {
    // Default to LocalBusiness for other categories
    return {
      ...baseSchema,
      '@type': 'LocalBusiness',
      address: {
        '@type': 'PostalAddress',
        addressLocality: destination.city,
        addressCountry: destination.country,
      },
    };
  }
}

/**
 * Generate breadcrumb schema for destination pages
 */
export function generateDestinationBreadcrumb(destination: Destination) {
  // Format city name for display
  const cityName = destination.city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.urbanmanual.co',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: cityName,
        item: `https://www.urbanmanual.co/city/${destination.city}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: destination.name,
        item: `https://www.urbanmanual.co/destination/${destination.slug}`,
      },
    ],
  };
}

/**
 * Generate breadcrumb schema for city pages
 */
export function generateCityBreadcrumb(city: string) {
  // Format city name for display
  const cityName = decodeURIComponent(city)
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.urbanmanual.co',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: cityName,
        item: `https://www.urbanmanual.co/city/${encodeURIComponent(city)}`,
      },
    ],
  };
}

/**
 * Generate FAQ schema for destination pages
 */
export function generateDestinationFAQ(destination: Destination) {
  const category = destination.category?.toLowerCase() || '';
  const cityName = destination.city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const faqs: Array<{ question: string; answer: string }> = [];

  // Generic FAQs based on category
  if (category === 'hotel') {
    faqs.push({
      question: `Where is ${destination.name} located?`,
      answer: `${destination.name} is located in ${cityName}${destination.country ? `, ${destination.country}` : ''}.`,
    });

    if (destination.price_level) {
      const priceDesc = destination.price_level === 1 ? 'budget-friendly' :
                        destination.price_level === 2 ? 'mid-range' :
                        destination.price_level === 3 ? 'upscale' : 'luxury';
      faqs.push({
        question: `What is the price range of ${destination.name}?`,
        answer: `${destination.name} is a ${priceDesc} hotel with a price level of ${'$'.repeat(destination.price_level)}.`,
      });
    }
  } else if (['restaurant', 'Restaurant', 'cafe', 'bar'].includes(category)) {
    faqs.push({
      question: `Where is ${destination.name} located?`,
      answer: `${destination.name} is a ${destination.category} located in ${cityName}${destination.country ? `, ${destination.country}` : ''}.`,
    });

    if (destination.michelin_stars && destination.michelin_stars > 0) {
      faqs.push({
        question: `Does ${destination.name} have Michelin stars?`,
        answer: `Yes, ${destination.name} has ${destination.michelin_stars} Michelin star${destination.michelin_stars > 1 ? 's' : ''}.`,
      });
    }

    if (destination.tags && destination.tags.length > 0) {
      faqs.push({
        question: `What type of cuisine does ${destination.name} serve?`,
        answer: `${destination.name} serves ${destination.tags.join(', ')} cuisine.`,
      });
    }
  }

  // Only return FAQ schema if we have questions
  if (faqs.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}


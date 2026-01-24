import type { Destination } from '@/types/destination';
import type { ValidationRule, ValidationResult } from '@/types/admin';

/**
 * Comprehensive validation rules for destinations
 */
export const destinationValidationRules: ValidationRule[] = [
  // Required fields (errors)
  {
    field: 'name',
    rule: 'required',
    severity: 'error',
    message: 'Destination name is required',
  },
  {
    field: 'slug',
    rule: 'required',
    severity: 'error',
    message: 'URL slug is required',
  },
  {
    field: 'city',
    rule: 'required',
    severity: 'error',
    message: 'City is required',
  },
  {
    field: 'category',
    rule: 'required',
    severity: 'error',
    message: 'Category is required',
  },

  // Name validation
  {
    field: 'name',
    rule: 'min_length',
    severity: 'error',
    message: 'Name must be at least 2 characters',
    value: 2,
  },
  {
    field: 'name',
    rule: 'max_length',
    severity: 'warning',
    message: 'Name should be under 100 characters for better display',
    value: 100,
  },

  // Slug validation
  {
    field: 'slug',
    rule: 'pattern',
    severity: 'error',
    message: 'Slug must be URL-safe (lowercase letters, numbers, hyphens only)',
    value: /^[a-z0-9-]+$/,
  },
  {
    field: 'slug',
    rule: 'unique',
    severity: 'error',
    message: 'This slug is already in use',
  },

  // Description validation
  {
    field: 'description',
    rule: 'min_length',
    severity: 'warning',
    message: 'Description should be at least 50 characters for better SEO',
    value: 50,
  },
  {
    field: 'description',
    rule: 'max_length',
    severity: 'warning',
    message: 'Description should be under 500 characters for readability',
    value: 500,
  },

  // Micro description validation
  {
    field: 'micro_description',
    rule: 'max_length',
    severity: 'warning',
    message: 'Micro description should be under 150 characters',
    value: 150,
  },

  // Image validation
  {
    field: 'image',
    rule: 'url',
    severity: 'error',
    message: 'Image must be a valid URL',
  },

  // Website validation
  {
    field: 'website',
    rule: 'url',
    severity: 'error',
    message: 'Website must be a valid URL',
  },

  // Coordinates validation
  {
    field: 'latitude',
    rule: 'required',
    severity: 'warning',
    message: 'Latitude recommended for map display',
  },
  {
    field: 'longitude',
    rule: 'required',
    severity: 'warning',
    message: 'Longitude recommended for map display',
  },

  // SEO fields validation
  {
    field: 'meta_title',
    rule: 'min_length',
    severity: 'warning',
    message: 'SEO title should be at least 30 characters',
    value: 30,
  },
  {
    field: 'meta_title',
    rule: 'max_length',
    severity: 'warning',
    message: 'SEO title should be under 60 characters',
    value: 60,
  },
  {
    field: 'meta_description',
    rule: 'min_length',
    severity: 'warning',
    message: 'Meta description should be at least 120 characters',
    value: 120,
  },
  {
    field: 'meta_description',
    rule: 'max_length',
    severity: 'warning',
    message: 'Meta description should be under 160 characters',
    value: 160,
  },
];

/**
 * Validates a destination against all rules
 */
export function validateDestination(destination: Partial<Destination>): ValidationResult {
  const errors: ValidationRule[] = [];
  const warnings: ValidationRule[] = [];

  for (const rule of destinationValidationRules) {
    const value = destination[rule.field as keyof Destination];
    const failed = checkRule(rule, value, destination);

    if (failed) {
      if (rule.severity === 'error') {
        errors.push(rule);
      } else {
        warnings.push(rule);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a specific rule fails
 */
function checkRule(
  rule: ValidationRule,
  value: unknown,
  destination: Partial<Destination>
): boolean {
  switch (rule.rule) {
    case 'required':
      return !value || (typeof value === 'string' && value.trim() === '');

    case 'min_length':
      if (typeof value !== 'string') return false;
      return value.length < (rule.value as number);

    case 'max_length':
      if (typeof value !== 'string') return false;
      return value.length > (rule.value as number);

    case 'url':
      if (!value || typeof value !== 'string') return false;
      try {
        new URL(value);
        return false;
      } catch {
        return true;
      }

    case 'email':
      if (!value || typeof value !== 'string') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(value);

    case 'pattern':
      if (!value || typeof value !== 'string') return false;
      const pattern = rule.value as RegExp;
      return !pattern.test(value);

    case 'unique':
      // Note: Unique validation requires database check, handled separately
      return false;

    default:
      return false;
  }
}

/**
 * Validates a specific field
 */
export function validateField(
  field: keyof Destination,
  value: unknown,
  destination: Partial<Destination>
): { errors: ValidationRule[]; warnings: ValidationRule[] } {
  const errors: ValidationRule[] = [];
  const warnings: ValidationRule[] = [];

  const fieldRules = destinationValidationRules.filter((rule) => rule.field === field);

  for (const rule of fieldRules) {
    if (checkRule(rule, value, destination)) {
      if (rule.severity === 'error') {
        errors.push(rule);
      } else {
        warnings.push(rule);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Calculates SEO score based on various factors
 */
export function calculateSEOScore(destination: Partial<Destination>): number {
  let score = 0;

  // Title checks (30 points)
  if (destination.meta_title) {
    const titleLength = destination.meta_title.length;
    score += 10; // Has title
    if (titleLength >= 30 && titleLength <= 60) {
      score += 10; // Optimal length
    } else if (titleLength > 0 && titleLength < 70) {
      score += 5; // Acceptable length
    }
    if (destination.name && destination.meta_title.includes(destination.name)) {
      score += 10; // Contains destination name
    }
  }

  // Description checks (25 points)
  if (destination.meta_description) {
    const descLength = destination.meta_description.length;
    score += 10; // Has description
    if (descLength >= 120 && descLength <= 160) {
      score += 10; // Optimal length
    } else if (descLength > 50 && descLength < 200) {
      score += 5; // Acceptable length
    }
  }

  // Image checks (15 points)
  if (destination.image) {
    score += 10; // Has image
  }
  if (destination.og_image) {
    score += 5; // Has OG image
  }

  // Content checks (20 points)
  if (destination.description && destination.description.length >= 100) {
    score += 10; // Has substantial description
  }
  if (destination.content && destination.content.length >= 200) {
    score += 10; // Has substantial content
  }

  // Structured data (10 points)
  if (destination.structured_data) {
    score += 10; // Has schema.org markup
  }

  // Deductions
  if (destination.noindex) {
    score = 0; // If noindex, SEO score is 0
  }

  return Math.min(score, 100);
}

/**
 * Generates auto-filled SEO fields from destination data
 */
export function generateSEODefaults(destination: Partial<Destination>): {
  meta_title: string;
  meta_description: string;
  structured_data: Record<string, unknown>;
} {
  // Generate meta title
  let metaTitle = destination.name || '';
  if (destination.category) {
    metaTitle += ` - ${destination.category}`;
  }
  if (destination.city) {
    metaTitle += ` in ${destination.city}`;
  }
  if (metaTitle.length > 60) {
    metaTitle = metaTitle.substring(0, 57) + '...';
  }

  // Generate meta description
  let metaDescription = '';
  if (destination.micro_description) {
    metaDescription = destination.micro_description;
  } else if (destination.description) {
    metaDescription =
      destination.description.length > 157
        ? destination.description.substring(0, 157) + '...'
        : destination.description;
  } else {
    metaDescription = `Discover ${destination.name} in ${destination.city || 'our travel guide'}`;
  }

  // Generate Schema.org structured data
  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': getSchemaType(destination.category),
    name: destination.name,
    description: destination.description || destination.micro_description,
  };

  if (destination.city || destination.country) {
    structuredData.address = {
      '@type': 'PostalAddress',
      addressLocality: destination.city,
      addressCountry: destination.country,
    };
  }

  if (destination.image) {
    structuredData.image = destination.image;
  }

  if (destination.rating) {
    structuredData.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: destination.rating,
      bestRating: 5,
    };
  }

  if (destination.latitude && destination.longitude) {
    structuredData.geo = {
      '@type': 'GeoCoordinates',
      latitude: destination.latitude,
      longitude: destination.longitude,
    };
  }

  if (destination.website) {
    structuredData.url = destination.website;
  }

  if (destination.phone_number) {
    structuredData.telephone = destination.phone_number;
  }

  return {
    meta_title: metaTitle,
    meta_description: metaDescription,
    structured_data: structuredData,
  };
}

/**
 * Maps category to Schema.org type
 */
function getSchemaType(category?: string): string {
  const typeMap: Record<string, string> = {
    Restaurant: 'Restaurant',
    Hotel: 'Hotel',
    Bar: 'BarOrPub',
    Cafe: 'CafeOrCoffeeShop',
    Museum: 'Museum',
    Gallery: 'ArtGallery',
    Shopping: 'Store',
  };

  return typeMap[category || ''] || 'Place';
}

/**
 * Auto-generates slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Client-side utilities for contextual search
 */

/**
 * Check if a query contains descriptive modifiers
 */
export function hasModifiers(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  const modifierIndicators = [
    'romantic', 'michelin', 'fine-dining', 'vegetarian', 'vegan', 'cute',
    'cozy', 'chic', 'elegant', 'casual', 'trendy', 'luxury', 'budget',
    'boutique', 'rooftop', 'outdoor', 'cafe', 'café'
  ];
  
  return modifierIndicators.some(modifier => 
    new RegExp(`\\b${modifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(query)
  );
}

/**
 * Call contextual search API
 */
export async function searchWithContext(query: string): Promise<{
  context: string;
  results: any[];
  noModifierMatches: boolean;
  intent?: any;
}> {
  const response = await fetch('/api/contextual-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  
  if (!response.ok) {
    throw new Error('Contextual search failed');
  }
  
  return response.json();
}


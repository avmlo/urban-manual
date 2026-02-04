/**
 * Currency Exchange API Integration
 * Using ExchangeRate-API (free tier: 1500 requests/month)
 */

export interface ExchangeRate {
  from: string; // Currency code (e.g., 'USD')
  to: string; // Currency code (e.g., 'EUR')
  rate: number;
  timestamp: string;
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();
    const rate = data.rates[toCurrency.toUpperCase()];
    
    return rate ? parseFloat(rate) : null;
  } catch (error: any) {
    console.error(`Error fetching exchange rate:`, error.message);
    return null;
  }
}

/**
 * Convert price from one currency to another
 */
export async function convertPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return amount;
  }

  const rate = await getExchangeRate(fromCurrency, toCurrency);
  
  if (rate === null) {
    return null;
  }

  return amount * rate;
}

/**
 * Get currency code for a location (city/country)
 * This is a simplified mapping - could be enhanced with a proper geocoding service
 */
export function getCurrencyCodeForCity(city: string, country?: string): string {
  // Common currency mappings
  const currencyMap: Record<string, string> = {
    // US cities
    'new york': 'USD',
    'los angeles': 'USD',
    'chicago': 'USD',
    'san francisco': 'USD',
    'miami': 'USD',
    
    // UK cities
    'london': 'GBP',
    
    // European cities
    'paris': 'EUR',
    'berlin': 'EUR',
    'rome': 'EUR',
    'madrid': 'EUR',
    'amsterdam': 'EUR',
    'vienna': 'EUR',
    'zurich': 'CHF',
    
    // Asian cities
    'tokyo': 'JPY',
    'osaka': 'JPY',
    'kyoto': 'JPY',
    'seoul': 'KRW',
    'singapore': 'SGD',
    'hong kong': 'HKD',
    'taipei': 'TWD',
    'bangkok': 'THB',
    
    // Other
    'sydney': 'AUD',
    'melbourne': 'AUD',
    'mexico city': 'MXN',
  };

  const cityLower = city.toLowerCase();
  
  if (currencyMap[cityLower]) {
    return currencyMap[cityLower];
  }

  // Country-based fallback
  if (country) {
    const countryMap: Record<string, string> = {
      'united states': 'USD',
      'united kingdom': 'GBP',
      'france': 'EUR',
      'germany': 'EUR',
      'italy': 'EUR',
      'spain': 'EUR',
      'netherlands': 'EUR',
      'austria': 'EUR',
      'switzerland': 'CHF',
      'japan': 'JPY',
      'south korea': 'KRW',
      'singapore': 'SGD',
      'hong kong': 'HKD',
      'taiwan': 'TWD',
      'thailand': 'THB',
      'australia': 'AUD',
      'mexico': 'MXN',
    };
    
    const countryLower = country.toLowerCase();
    if (countryMap[countryLower]) {
      return countryMap[countryLower];
    }
  }

  // Default to USD
  return 'USD';
}


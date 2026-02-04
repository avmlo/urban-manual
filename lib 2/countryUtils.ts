/**
 * Country utilities for mapping country codes and names
 * Uses ISO 3166-1 alpha-3 codes for consistency with TopoJSON
 */

// ISO 3166-1 alpha-3 to alpha-2 mapping (for flag emojis)
export const COUNTRY_CODE_MAP: Record<string, string> = {
  // Major countries
  'USA': 'US',
  'GBR': 'GB',
  'CAN': 'CA',
  'AUS': 'AU',
  'NZL': 'NZ',
  'JPN': 'JP',
  'CHN': 'CN',
  'IND': 'IN',
  'BRA': 'BR',
  'RUS': 'RU',
  'DEU': 'DE',
  'FRA': 'FR',
  'ITA': 'IT',
  'ESP': 'ES',
  'NLD': 'NL',
  'BEL': 'BE',
  'CHE': 'CH',
  'AUT': 'AT',
  'SWE': 'SE',
  'NOR': 'NO',
  'DNK': 'DK',
  'FIN': 'FI',
  'POL': 'PL',
  'CZE': 'CZ',
  'IRL': 'IE',
  'ISL': 'IS',
  'PRT': 'PT',
  'GRC': 'GR',
  'TUR': 'TR',
  'ISR': 'IL',
  'JOR': 'JO',
  'ARE': 'AE',
  'SAU': 'SA',
  'QAT': 'QA',
  'THA': 'TH',
  'SGP': 'SG',
  'MYS': 'MY',
  'IDN': 'ID',
  'PHL': 'PH',
  'VNM': 'VN',
  'KOR': 'KR',
  'TWN': 'TW',
  'HKG': 'HK',
  'MEX': 'MX',
  'ARG': 'AR',
  'CHL': 'CL',
  'PER': 'PE',
  'COL': 'CO',
  'ZAF': 'ZA',
  'EGY': 'EG',
  'MAR': 'MA',
  'LBN': 'LB',
  // Add more as needed
};

// Full country name mapping (alpha-3 to display name)
export const COUNTRY_NAME_MAP: Record<string, string> = {
  'USA': 'United States',
  'GBR': 'United Kingdom',
  'CAN': 'Canada',
  'AUS': 'Australia',
  'NZL': 'New Zealand',
  'JPN': 'Japan',
  'CHN': 'China',
  'IND': 'India',
  'BRA': 'Brazil',
  'RUS': 'Russia',
  'DEU': 'Germany',
  'FRA': 'France',
  'ITA': 'Italy',
  'ESP': 'Spain',
  'NLD': 'Netherlands',
  'BEL': 'Belgium',
  'CHE': 'Switzerland',
  'AUT': 'Austria',
  'SWE': 'Sweden',
  'NOR': 'Norway',
  'DNK': 'Denmark',
  'FIN': 'Finland',
  'POL': 'Poland',
  'CZE': 'Czech Republic',
  'IRL': 'Ireland',
  'ISL': 'Iceland',
  'PRT': 'Portugal',
  'GRC': 'Greece',
  'TUR': 'Turkey',
  'ISR': 'Israel',
  'JOR': 'Jordan',
  'ARE': 'United Arab Emirates',
  'SAU': 'Saudi Arabia',
  'QAT': 'Qatar',
  'THA': 'Thailand',
  'SGP': 'Singapore',
  'MYS': 'Malaysia',
  'IDN': 'Indonesia',
  'PHL': 'Philippines',
  'VNM': 'Vietnam',
  'KOR': 'South Korea',
  'TWN': 'Taiwan',
  'HKG': 'Hong Kong',
  'MEX': 'Mexico',
  'ARG': 'Argentina',
  'CHL': 'Chile',
  'PER': 'Peru',
  'COL': 'Colombia',
  'ZAF': 'South Africa',
  'EGY': 'Egypt',
  'MAR': 'Morocco',
  'LBN': 'Lebanon',
};

/**
 * Get flag emoji from alpha-3 country code
 */
export function getCountryFlag(countryCode: string): string {
  const alpha2 = COUNTRY_CODE_MAP[countryCode.toUpperCase()];
  if (!alpha2) return '🌍';
  
  const codePoints = alpha2
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Get country name from alpha-3 code
 */
export function getCountryName(countryCode: string): string {
  return COUNTRY_NAME_MAP[countryCode.toUpperCase()] || countryCode;
}

/**
 * Map TopoJSON property codes to our country codes
 * TopoJSON uses various property names - this normalizes them
 */
export function normalizeCountryCode(properties: any): string | null {
  // Try different property names that TopoJSON might use
  const code = 
    properties.ISO_A3 ||
    properties.iso_a3 ||
    properties.ISO3 ||
    properties.iso3 ||
    properties.ADM0_A3 ||
    properties.adm0_a3 ||
    properties.code ||
    null;
  
  if (!code || code === '-99' || code === 'N/A') return null;
  return code.toUpperCase();
}

/**
 * Get country name from TopoJSON properties
 */
export function getCountryNameFromProperties(properties: any): string {
  return (
    properties.NAME ||
    properties.name ||
    properties.NAME_EN ||
    properties.name_en ||
    properties.ADMIN ||
    properties.admin ||
    'Unknown Country'
  );
}


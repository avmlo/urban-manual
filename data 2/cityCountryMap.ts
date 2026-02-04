// Mapping of cities to their countries
export const cityCountryMap: Record<string, string> = {
  // Taiwan
  'taipei': 'Taiwan',
  'taichung': 'Taiwan',
  'tainan': 'Taiwan',
  'kaohsiung': 'Taiwan',
  'pintung': 'Taiwan',
  'chiayi': 'Taiwan',
  
  // Japan
  'tokyo': 'Japan',
  'kyoto': 'Japan',
  'osaka': 'Japan',
  'fukuoka': 'Japan',
  'sapporo': 'Japan',
  'nagoya': 'Japan',
  'kobe': 'Japan',
  'yokohama': 'Japan',
  'nara': 'Japan',
  'hiroshima': 'Japan',
  'kyushu': 'Japan',
  'nagato': 'Japan',
  'karuizawa': 'Japan',
  'okinawa': 'Japan',
  'kamakura': 'Japan',
  'kanazawa': 'Japan',
  'atami': 'Japan',
  'hakone': 'Japan',
  
  // USA
  'new-york': 'USA',
  'los-angeles': 'USA',
  'san-francisco': 'USA',
  'chicago': 'USA',
  'miami': 'USA',
  'seattle': 'USA',
  'boston': 'USA',
  'portland': 'USA',
  'austin': 'USA',
  'denver': 'USA',
  'las-vegas': 'USA',
  'washington-dc': 'USA',
  'philadelphia': 'USA',
  'san-diego': 'USA',
  'nashville': 'USA',
  'new-orleans': 'USA',
  'colorado': 'USA',
  'charleston': 'USA',
  'hawaii': 'USA',
  'orlando': 'USA',
  'hudson-valley': 'USA',
  
  // UK
  'london': 'UK',
  'edinburgh': 'UK',
  'manchester': 'UK',
  'liverpool': 'UK',
  'bristol': 'UK',
  'oxford': 'UK',
  'cambridge': 'UK',
  
  // France
  'paris': 'France',
  'lyon': 'France',
  'marseille': 'France',
  'nice': 'France',
  'bordeaux': 'France',
  'cannes': 'France',
  'provence-alpes-cote-d-azur': 'France',
  'auvergne-rhone-alpes': 'France',
  
  // Italy
  'rome': 'Italy',
  'milan': 'Italy',
  'florence': 'Italy',
  'venice': 'Italy',
  'naples': 'Italy',
  'bologna': 'Italy',
  'turin': 'Italy',
  'como': 'Italy',
  'lake-como': 'Italy',
  
  // Spain
  'barcelona': 'Spain',
  'madrid': 'Spain',
  'seville': 'Spain',
  'valencia': 'Spain',
  'bilbao': 'Spain',
  'san-sebastian': 'Spain',
  
  // Germany
  'berlin': 'Germany',
  'munich': 'Germany',
  'hamburg': 'Germany',
  'frankfurt': 'Germany',
  'cologne': 'Germany',
  'dresden': 'Germany',
  
  // Netherlands
  'amsterdam': 'Netherlands',
  'rotterdam': 'Netherlands',
  'the-hague': 'Netherlands',
  'utrecht': 'Netherlands',
  
  // Switzerland
  'zurich': 'Switzerland',
  'geneva': 'Switzerland',
  'basel': 'Switzerland',
  'bern': 'Switzerland',
  'lausanne': 'Switzerland',
  'luzern': 'Switzerland',
  'valais': 'Switzerland',
  
  // Austria
  'vienna': 'Austria',
  'salzburg': 'Austria',
  'innsbruck': 'Austria',
  
  // Belgium
  'brussels': 'Belgium',
  'bruges': 'Belgium',
  'antwerp': 'Belgium',
  'ghent': 'Belgium',
  
  // Denmark
  'copenhagen': 'Denmark',
  'aarhus': 'Denmark',
  
  // Sweden
  'stockholm': 'Sweden',
  'gothenburg': 'Sweden',
  'malmo': 'Sweden',
  
  // Norway
  'oslo': 'Norway',
  'bergen': 'Norway',
  
  // Finland
  'helsinki': 'Finland',
  
  // Iceland
  'reykjavik': 'Iceland',
  
  // Portugal
  'lisbon': 'Portugal',
  'porto': 'Portugal',
  
  // Greece
  'athens': 'Greece',
  'santorini': 'Greece',
  'mykonos': 'Greece',
  
  // Turkey
  'istanbul': 'Turkey',
  'ankara': 'Turkey',
  
  // UAE
  'dubai': 'UAE',
  'abu-dhabi': 'UAE',
  
  // Singapore
  'singapore': 'Singapore',
  
  // Hong Kong
  'hong-kong': 'Hong Kong',
  
  // South Korea
  'seoul': 'South Korea',
  'busan': 'South Korea',
  
  // China
  'beijing': 'China',
  'shanghai': 'China',
  'guangzhou': 'China',
  'shenzhen': 'China',
  'chengdu': 'China',
  'hangzhou': 'China',
  
  // Thailand
  'bangkok': 'Thailand',
  'chiang-mai': 'Thailand',
  'phuket': 'Thailand',
  'koh-samui': 'Thailand',
  
  // Malaysia
  'kuala-lumpur': 'Malaysia',
  'penang': 'Malaysia',
  
  // Indonesia
  'bali': 'Indonesia',
  'jakarta': 'Indonesia',
  
  // Vietnam
  'hanoi': 'Vietnam',
  'ho-chi-minh-city': 'Vietnam',
  'saigon': 'Vietnam',
  'da-nang': 'Vietnam',
  
  // Philippines
  'manila': 'Philippines',
  
  // Australia
  'sydney': 'Australia',
  'melbourne': 'Australia',
  'brisbane': 'Australia',
  'perth': 'Australia',
  'adelaide': 'Australia',
  
  // New Zealand
  'auckland': 'New Zealand',
  'wellington': 'New Zealand',
  'queenstown': 'New Zealand',
  
  // Canada
  'toronto': 'Canada',
  'vancouver': 'Canada',
  'montreal': 'Canada',
  'calgary': 'Canada',
  'ottawa': 'Canada',
  
  // Mexico
  'mexico-city': 'Mexico',
  'cancun': 'Mexico',
  'guadalajara': 'Mexico',
  
  // Brazil
  'sao-paulo': 'Brazil',
  'rio-de-janeiro': 'Brazil',
  
  // Argentina
  'buenos-aires': 'Argentina',
  
  // South Africa
  'cape-town': 'South Africa',
  'johannesburg': 'South Africa',
  
  // Morocco
  'marrakech': 'Morocco',
  'casablanca': 'Morocco',
  
  // Egypt
  'cairo': 'Egypt',
};

// Priority order for countries
export const countryOrder = [
  'Taiwan',
  'Japan',
  'USA',
  'UK',
  'France',
  'Italy',
  'Spain',
  'Germany',
  'Netherlands',
  'Switzerland',
  'Austria',
  'Belgium',
  'Denmark',
  'Sweden',
  'Norway',
  'Finland',
  'Iceland',
  'Portugal',
  'Greece',
  'Turkey',
  'UAE',
  'Singapore',
  'Hong Kong',
  'South Korea',
  'China',
  'Thailand',
  'Malaysia',
  'Indonesia',
  'Vietnam',
  'Philippines',
  'Australia',
  'New Zealand',
  'Canada',
  'Mexico',
  'Brazil',
  'Argentina',
  'South Africa',
  'Morocco',
  'Egypt',
];


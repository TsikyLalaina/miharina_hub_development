// packages/shared/constants/madagascar.ts

// Madagascar Regions
export const MADAGASCAR_REGIONS = {
  'Antananarivo': {
    name: 'Antananarivo',
    nameMg: 'Antananarivo',
    capital: 'Antananarivo',
    code: 'T',
    population: 3900000,
    area: 58741,
    districts: [
      'Antananarivo Atsimondrano',
      'Antananarivo Avaradrano',
      'Antananarivo Renivohitra',
      'Ambohidratrimo',
      'Andramasina',
      'Anjozorobe',
      'Ankazobe',
      'Antanifotsy',
      'Betafo',
      'Faratsiho',
      'Mandoto',
      'Manjakandriana',
      'Miarinarivo',
      'Tsiroanomandidy'
    ]
  },
  'Fianarantsoa': {
    name: 'Fianarantsoa',
    nameMg: 'Fianarantsoa',
    capital: 'Fianarantsoa',
    code: 'F',
    population: 4500000,
    area: 103272,
    districts: [
      'Fianarantsoa',
      'Ambalavao',
      'Ambatofinandrahana',
      'Amboasary Atsimo',
      'Ambohimahasoa',
      'Ampanihy Ouest',
      'Ankazoabo Atsimo',
      'Ankazoabo',
      'Bekily',
      'Beloha',
      'Benenitra',
      'Beroroha',
      'Iakora',
      'Ihosy',
      'Isandra',
      'Ivohibe',
      'Midongy Atsimo',
      'Morombe',
      'Nosy Varika',
      'Sakaraha',
      'Toliara II',
      'Tsiombe',
      'Vangaindrano',
      'Vohibato',
      'Vohipeno',
      'Vondrozo'
    ]
  },
  'Toamasina': {
    name: 'Toamasina',
    nameMg: 'Toamasina',
    capital: 'Toamasina',
    code: 'A',
    population: 3600000,
    area: 71911,
    districts: [
      'Toamasina I',
      'Toamasina II',
      'Ambatondrazaka',
      'Amparafaravola',
      'Andilamena',
      'Anosibe An\'ala',
      'Antanambao Manampontsy',
      'Brickaville',
      'Mahajanga II',
      'Mahanoro',
      'Mananara Avaratra',
      'Maroantsetra',
      'Moramanga',
      'Nosy-Boraha',
      'Nosy-Varika',
      'Vavatenina',
      'Vohibinany',
      'Fenerive Est'
    ]
  },
  'Mahajanga': {
    name: 'Mahajanga',
    nameMg: 'Mahajanga',
    capital: 'Mahajanga',
    code: 'M',
    population: 2800000,
    area: 150023,
    districts: [
      'Mahajanga I',
      'Mahajanga II',
      'Ambato-Boeni',
      'Ambatomainty',
      'Ambatomainty Atsimo',
      'Analalava',
      'Andapa',
      'Antalaha',
      'Antsohihy',
      'Bealanana',
      'Befandriana Avaratra',
      'Befandriana Nord',
      'Boriziny',
      'Kandreho',
      'Mampikony',
      'Mandritsara',
      'Marovoay',
      'Mitsinjo',
      'Morafenobe',
      'Sofia',
      'Tsaratanana'
    ]
  },
  'Toliara': {
    name: 'Toliara',
    nameMg: 'Toliara',
    capital: 'Toliara',
    code: 'U',
    population: 3200000,
    area: 161405,
    districts: [
      'Toliara I',
      'Toliara II',
      'Amboasary Atsimo',
      'Ampanihy Ouest',
      'Ankazoabo Atsimo',
      'Ankazoabo',
      'Bekily',
      'Beloha',
      'Benenitra',
      'Beroroha',
      'Iakora',
      'Morombe',
      'Sakaraha',
      'Tsiombe',
      'Tuléar',
      'Ampanihy',
      'Andranovory',
      'Ankazoabo Sud',
      'Betioky Atsimo',
      'Betioky',
      'Ranohira',
      'Toliara Nord',
      'Toliara Sud'
    ]
  },
  'Antsiranana': {
    name: 'Antsiranana',
    nameMg: 'Antsiranana',
    capital: 'Antsiranana',
    code: 'D',
    population: 1800000,
    area: 43232,
    districts: [
      'Antsiranana I',
      'Antsiranana II',
      'Ambanja',
      'Ambilobe',
      'Analamerana',
      'Andapa',
      'Antalaha',
      'Bealanana',
      'Befandriana Avaratra',
      'Diana',
      'Nosy-Be',
      'Sambava',
      'Vohemar'
    ]
  }
} as const;

// Business Types in Madagascar context
export const BUSINESS_TYPES = {
  agricultural: {
    name: 'Agricultural',
    nameMg: 'Fambolena',
    nameFr: 'Agriculture',
    description: 'Agriculture, livestock, fishing, and related activities',
    subcategories: [
      'Crop farming',
      'Livestock',
      'Fishing',
      'Agro-processing',
      'Organic farming',
      'Export crops'
    ]
  },
  artisan: {
    name: 'Artisan',
    nameMg: 'Asa tanana',
    nameFr: 'Artisanat',
    description: 'Handicrafts, traditional crafts, and small-scale manufacturing',
    subcategories: [
      'Handicrafts',
      'Textiles',
      'Woodworking',
      'Pottery',
      'Jewelry',
      'Traditional crafts'
    ]
  },
  digital_services: {
    name: 'Digital Services',
    nameMg: 'Serivisy nomerika',
    nameFr: 'Services numériques',
    description: 'Technology services, software development, and digital solutions',
    subcategories: [
      'Software development',
      'Web development',
      'Mobile apps',
      'Digital marketing',
      'IT services',
      'E-commerce'
    ]
  },
  manufacturing: {
    name: 'Manufacturing',
    nameMg: 'Famokarana',
    nameFr: 'Fabrication',
    description: 'Production and manufacturing of goods',
    subcategories: [
      'Food processing',
      'Textile manufacturing',
      'Construction materials',
      'Consumer goods',
      'Industrial products'
    ]
  },
  retail: {
    name: 'Retail',
    nameMg: 'Fivarotana',
    nameFr: 'Commerce de détail',
    description: 'Retail sales and distribution',
    subcategories: [
      'Local retail',
      'Online retail',
      'Wholesale',
      'Import/export',
      'Distribution'
    ]
  },
  tourism: {
    name: 'Tourism',
    nameMg: 'Fizahantany',
    nameFr: 'Tourisme',
    description: 'Tourism and hospitality services',
    subcategories: [
      'Tour operators',
      'Hotels',
      'Restaurants',
      'Transport services',
      'Cultural tourism'
    ]
  },
  food_processing: {
    name: 'Food Processing',
    nameMg: 'Fikarakarana sakafo',
    nameFr: 'Transformation alimentaire',
    description: 'Processing and preservation of food products',
    subcategories: [
      'Fruit processing',
      'Spice processing',
      'Coffee processing',
      'Dairy products',
      'Bakery products'
    ]
  },
  textile: {
    name: 'Textile',
    nameMg: 'Lamba',
    nameFr: 'Textile',
    description: 'Textile production and garment manufacturing',
    subcategories: [
      'Cotton textiles',
      'Silk production',
      'Garment manufacturing',
      'Traditional textiles',
      'Export textiles'
    ]
  }
} as const;

// Export Markets for Madagascar
export const EXPORT_MARKETS = {
  africa: {
    name: 'Africa',
    countries: [
      'South Africa',
      'Kenya',
      'Nigeria',
      'Ghana',
      'Senegal',
      'Mauritius',
      'Comoros',
      'Réunion'
    ]
  },
  europe: {
    name: 'Europe',
    countries: [
      'France',
      'Germany',
      'Netherlands',
      'United Kingdom',
      'Belgium',
      'Italy',
      'Spain'
    ]
  },
  asia: {
    name: 'Asia',
    countries: [
      'China',
      'Japan',
      'South Korea',
      'India',
      'Singapore',
      'Thailand'
    ]
  },
  americas: {
    name: 'Americas',
    countries: [
      'United States',
      'Canada',
      'Brazil'
    ]
  }
} as const;

// Currency Information
export const CURRENCIES = {
  MGA: {
    code: 'MGA',
    name: 'Malagasy Ariary',
    nameMg: 'Ariary Malagasy',
    nameFr: 'Ariary Malgache',
    symbol: 'Ar',
    decimals: 0
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    nameMg: 'Dolara Amerikanina',
    nameFr: 'Dollar américain',
    symbol: '$',
    decimals: 2
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    nameMg: 'Eoro',
    nameFr: 'Euro',
    symbol: '€',
    decimals: 2
  }
} as const;

// Languages supported
export const LANGUAGES = {
  fr: {
    code: 'fr',
    name: 'French',
    nameNative: 'Français',
    flag: '🇫🇷'
  },
  mg: {
    code: 'mg',
    name: 'Malagasy',
    nameNative: 'Malagasy',
    flag: '🇲🇬'
  },
  en: {
    code: 'en',
    name: 'English',
    nameNative: 'English',
    flag: '🇬🇧'
  }
} as const;

// Time zones
export const TIME_ZONE = 'Indian/Antananarimo';

// Phone number format for Madagascar
export const PHONE_NUMBER_FORMAT = {
  countryCode: '+261',
  pattern: /^\+261[0-9]{9}$/,
  example: '+261341234567',
  length: 9
};

// Date formats
export const DATE_FORMATS = {
  display: {
    fr: 'DD/MM/YYYY',
    mg: 'DD/MM/YYYY',
    en: 'MM/DD/YYYY'
  },
  api: 'YYYY-MM-DD',
  database: 'YYYY-MM-DD HH:mm:ss'
};

// File upload limits
export const UPLOAD_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedDocumentTypes: ['application/pdf', 'text/plain', 'application/msword'],
  maxFilesPerUser: 100
};

// Pagination defaults
export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100
};

// Cache TTL in seconds
export const CACHE_TTL = {
  userProfile: 3600, // 1 hour
  businessList: 1800, // 30 minutes
  opportunities: 900, // 15 minutes
  matches: 600, // 10 minutes
  staticData: 86400 // 24 hours
};

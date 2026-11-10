/**
 * Curated travel photography assets & category mapping for Gantavya Destination Discovery.
 * High-resolution imagery from Unsplash CDN with optimized WebP compression.
 */

// Category icons & metadata
export const DESTINATION_CATEGORIES = [
  {
    id: 'all',
    label: 'All Destinations',
    iconName: 'Compass',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
    description: 'Explore every corner of the multimodal network'
  },
  {
    id: 'mountains',
    backendCategory: 'trekking',
    label: 'Mountains & Trekking',
    iconName: 'Mountain',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80',
    description: 'Soaring alpine peaks, Himalayan passes, and scenic trails'
  },
  {
    id: 'cultural',
    backendCategory: 'cultural',
    label: 'Culture & Heritage',
    iconName: 'Landmark',
    image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80',
    description: 'Ancient monuments, royal palaces, and living traditions'
  },
  {
    id: 'spiritual',
    backendCategory: 'spiritual',
    label: 'Religious & Spiritual',
    iconName: 'Flame',
    image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
    description: 'Sacred temples, monastic sanctuaries, and pilgrimage sites'
  },
  {
    id: 'adventure',
    backendCategory: 'adventure',
    label: 'Adventure & Sports',
    iconName: 'Zap',
    image: 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=800&q=80',
    description: 'White water rafting, paragliding, and rugged expeditions'
  },
  {
    id: 'wildlife',
    backendCategory: 'wildlife',
    label: 'Wildlife & Safari',
    iconName: 'PawPrint',
    image: 'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=800&q=80',
    description: 'Protected national parks, rhinos, tigers, and biodiversity'
  },
  {
    id: 'urban',
    backendCategory: 'urban',
    label: 'Cities & Urban Life',
    iconName: 'Building2',
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80',
    description: 'Vibrant metropolitan centers, bazaars, and modern architecture'
  },
  {
    id: 'beaches',
    backendCategory: 'scenic',
    label: 'Beaches & Coastal',
    iconName: 'Waves',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    description: 'Golden sandy shorelines, crystal lagoons, and coastal breezes'
  },
  {
    id: 'forests',
    backendCategory: 'nature',
    label: 'Forests & Nature',
    iconName: 'Trees',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    description: 'Lush green valleys, botanical wonders, and quiet getaways'
  }
];

// Curated destination photo bank (keyed by lowercase substrings)
const DESTINATION_PHOTO_BANK = {
  pokhara: [
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80'
  ],
  kathmandu: [
    'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80'
  ],
  annapurna: [
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
  ],
  everest: [
    'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80'
  ],
  delhi: [
    'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1592635196078-9fdc757f27f4?auto=format&fit=crop&w=1200&q=80'
  ],
  jaipur: [
    'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1603258849047-97d02eb896d8?auto=format&fit=crop&w=1200&q=80'
  ],
  raipur: [
    'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80'
  ],
  chitwan: [
    'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=1200&q=80'
  ],
  goa: [
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80'
  ]
};

// Generic thematic fallbacks
const GENERIC_THEME_PHOTOS = [
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
];

/**
 * Returns a high-res cover image URL for a given destination.
 */
export function getDestinationCover(destination) {
  if (destination?.metadata?.coverImageUrl) {
    return destination.metadata.coverImageUrl;
  }

  const name = (destination?.name || '').toLowerCase();
  const city = (destination?.city || '').toLowerCase();

  for (const [key, photos] of Object.entries(DESTINATION_PHOTO_BANK)) {
    if (name.includes(key) || city.includes(key)) {
      return photos[0];
    }
  }

  // Check category matches
  if (Array.isArray(destination?.categories)) {
    for (const cat of destination.categories) {
      const match = DESTINATION_CATEGORIES.find((c) => c.backendCategory === cat);
      if (match?.image) return match.image;
    }
  }

  const hash = Math.abs((destination?._id || destination?.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return GENERIC_THEME_PHOTOS[hash % GENERIC_THEME_PHOTOS.length];
}

/**
 * Returns an array of gallery photos for a destination.
 */
export function getDestinationGallery(destination) {
  const cover = getDestinationCover(destination);
  const name = (destination?.name || '').toLowerCase();
  const city = (destination?.city || '').toLowerCase();

  for (const [key, photos] of Object.entries(DESTINATION_PHOTO_BANK)) {
    if (name.includes(key) || city.includes(key)) {
      return photos;
    }
  }

  return [
    cover,
    ...GENERIC_THEME_PHOTOS.filter((p) => p !== cover).slice(0, 3)
  ];
}

/**
 * Returns an image for a specific place of interest (POI).
 */
export function getPlacePhoto(place) {
  const cat = (place?.category || '').toLowerCase();
  const name = (place?.name || '').toLowerCase();

  if (name.includes('lake') || name.includes('water')) {
    return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('pagoda') || name.includes('temple') || name.includes('stupa')) {
    return 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('nature') || cat.includes('viewpoint')) {
    return 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('restaurant') || cat.includes('dining')) {
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('historical') || cat.includes('culture')) {
    return 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80';
  }

  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80';
}


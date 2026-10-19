/**
 * Shop location and contact details shown to customers.
 */
export const SHOP_INFO = {
  name: 'MotoCare Motorcycle Workshop',
  address: 'Cay Ban Ban St, Parada, Santa Maria, 3022 Bulacan',
  /** What Google Maps searches for: an exact address, a place name, or "14.8183,120.9563" coordinates */
  mapsQuery: '14.8152686,120.9882518', // exact pin of the shop building (Garahe Motoworks on Google Maps)
  phone: '+63 985 245 5897',
  hours: 'Monday – Saturday, 8:00 AM – 6:00 PM · Closed Sunday',
};

/** Opens the shop in Google Maps (app on phones, website on computers) */
export const SHOP_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP_INFO.mapsQuery)}`;

/** Turn-by-turn directions from wherever the customer is to the shop */
export const SHOP_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(SHOP_INFO.mapsQuery)}`;

/** Small map preview that needs no API key */
export const SHOP_MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(SHOP_INFO.mapsQuery)}&z=17&output=embed`;

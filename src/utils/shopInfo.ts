import { useMemo } from 'react';
import { DEFAULT_SITE_CONTENT, useSiteContent } from './siteContent';

const SHOP_NAME = 'MotoCare Motorcycle Workshop';
// The exact pin of the shop building; used until the owner changes the address
const DEFAULT_MAPS_QUERY = '14.8152686,120.9882518';

/**
 * Shop location and contact details shown to customers, live from Website content.
 */
export function useShopInfo() {
  const content = useSiteContent();
  return useMemo(() => {
    const mapsQuery = encodeURIComponent(
      content.address === DEFAULT_SITE_CONTENT.address ? DEFAULT_MAPS_QUERY : content.address
    );
    return {
      name: SHOP_NAME,
      address: content.address,
      phone: content.phone,
      email: content.email,
      openDays: content.openDays,
      openHours: content.openHours,
      closedDays: content.closedDays,
      hours: `${content.openDays}, ${content.openHours}${content.closedDays ? ` · Closed ${content.closedDays}` : ''}`,
      // Opens the shop in Google Maps (app on phones, website on computers)
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
      // Turn-by-turn directions from wherever the customer is to the shop
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`,
      // Small map preview that needs no API key
      mapEmbedUrl: `https://www.google.com/maps?q=${mapsQuery}&z=17&output=embed`,
    };
  }, [content]);
}

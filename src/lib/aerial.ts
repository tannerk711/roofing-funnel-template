import { SITE } from "../config/site";

export interface Bbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

const METERS_PER_DEG_LAT = 111320;

/**
 * Square bbox centered on lat/lng, boxMeters on each side, in EPSG:4326.
 * Used both for the Esri export request and for projecting the OSM roof
 * polygon onto that image.
 */
export function getAerialBbox(
  lat: number,
  lng: number,
  boxMeters: number = SITE.aerial.boxMeters,
): Bbox {
  const dLat = boxMeters / METERS_PER_DEG_LAT;
  const dLng = boxMeters / (METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return {
    west: lng - dLng / 2,
    south: lat - dLat / 2,
    east: lng + dLng / 2,
    north: lat + dLat / 2,
  };
}

/**
 * Keyless overhead satellite image of the home. Esri World Imagery static
 * export by default. Swap SITE.aerial.provider to "google" + set a key to use
 * Google Static Maps instead; nothing else in the app changes.
 * NOTE: polygon overlay projection (projectToImage) is exact for the esri
 * provider because we request imageSR=4326 over the same bbox.
 */
export function getAerialImageUrl(lat: number, lng: number): string {
  const size = SITE.aerial.imageSize;
  if (SITE.aerial.provider === "google" && SITE.aerial.googleMapsKey) {
    const px = Math.min(size, 640);
    return (
      "https://maps.googleapis.com/maps/api/staticmap" +
      `?center=${lat},${lng}&zoom=19&size=${px}x${px}&scale=2&maptype=satellite` +
      `&key=${SITE.aerial.googleMapsKey}`
    );
  }
  const b = getAerialBbox(lat, lng);
  const bbox = [b.west, b.south, b.east, b.north].join(",");
  return (
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export" +
    `?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${size},${size}&format=png&f=image`
  );
}

/**
 * Project a lat/lng into normalized 0..1 image coordinates (top-left origin)
 * for the esri aerial image produced by getAerialImageUrl. Linear in both
 * axes because the image is rendered in EPSG:4326 over this exact bbox.
 */
export function projectToImage(
  lat: number,
  lng: number,
  bbox: Bbox,
): { x: number; y: number } {
  return {
    x: (lng - bbox.west) / (bbox.east - bbox.west),
    y: (bbox.north - lat) / (bbox.north - bbox.south),
  };
}

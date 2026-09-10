/** Geographic helpers. Pure functions — no React, no network. */

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two points. */
export function haversineMetres(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Decodes a Google/OTP encoded polyline into coordinates.
 *
 * OneMap returns route geometry in this format (`legGeometry.points`). The
 * algorithm reads 5-bit chunks little-endian, where a set high bit means
 * "another chunk follows", and each value is a zig-zag encoded delta from the
 * previous point at 1e-5 degree precision.
 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    for (const axis of ['lat', 'lng'] as const) {
      let result = 0;
      let shift = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      // Zig-zag decode: odd numbers are negative.
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 'lat') lat += delta;
      else lng += delta;
    }

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/** Formats a distance for display: "240 m", "1.4 km". */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/** Bounding box enclosing all points, or null when given none. */
export function boundsOf(points: LatLng[]): { sw: LatLng; ne: LatLng } | null {
  if (points.length === 0) return null;

  return points.reduce(
    (acc, p) => ({
      sw: { lat: Math.min(acc.sw.lat, p.lat), lng: Math.min(acc.sw.lng, p.lng) },
      ne: { lat: Math.max(acc.ne.lat, p.lat), lng: Math.max(acc.ne.lng, p.lng) },
    }),
    { sw: { ...points[0] }, ne: { ...points[0] } },
  );
}

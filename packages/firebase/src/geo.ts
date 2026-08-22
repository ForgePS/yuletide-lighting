/** Distance between two WGS84 points in statute miles. */
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.7613;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type GeoPoint = { id: string; lat: number; lng: number };

/**
 * Greedy nearest-neighbor ordering.
 * When `start` is provided, the tour begins from that point (not included in the result).
 * Otherwise the first point in `points` is used as the start and kept first in the result.
 */
export function nearestNeighborOrder(points: GeoPoint[], start?: { lat: number; lng: number }): GeoPoint[] {
  if (points.length === 0) return [];

  const remaining = [...points];
  const ordered: GeoPoint[] = [];

  let currentLat: number;
  let currentLng: number;

  if (start) {
    currentLat = start.lat;
    currentLng = start.lng;
  } else {
    const first = remaining.shift()!;
    ordered.push(first);
    currentLat = first.lat;
    currentLng = first.lng;
  }

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineMiles(currentLat, currentLng, remaining[i]!.lat, remaining[i]!.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    const next = remaining.splice(nearestIdx, 1)[0]!;
    ordered.push(next);
    currentLat = next.lat;
    currentLng = next.lng;
  }

  return ordered;
}

export function pathDistanceMiles(points: Array<{ lat: number; lng: number }>, start?: { lat: number; lng: number }): number {
  if (points.length === 0) return 0;
  let total = 0;
  let prevLat = start?.lat ?? points[0]!.lat;
  let prevLng = start?.lng ?? points[0]!.lng;
  const from = start ? 0 : 1;
  for (let i = from; i < points.length; i++) {
    total += haversineMiles(prevLat, prevLng, points[i]!.lat, points[i]!.lng);
    prevLat = points[i]!.lat;
    prevLng = points[i]!.lng;
  }
  return total;
}

/** Urban travel estimate: 25 mph. */
export function travelMinutesFromMiles(miles: number): number {
  return Math.round((miles / 25) * 60);
}

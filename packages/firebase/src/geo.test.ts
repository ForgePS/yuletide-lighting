import { describe, expect, it } from 'vitest';
import { haversineMiles, nearestNeighborOrder, pathDistanceMiles, travelMinutesFromMiles } from './geo';

describe('geo helpers', () => {
  it('computes haversine distance in miles', () => {
    // Roughly NYC → Philly ≈ 80 miles
    const miles = haversineMiles(40.7128, -74.006, 39.9526, -75.1652);
    expect(miles).toBeGreaterThan(75);
    expect(miles).toBeLessThan(90);
  });

  it('returns 0 for identical points', () => {
    expect(haversineMiles(33.75, -84.39, 33.75, -84.39)).toBe(0);
  });

  it('orders points with nearest neighbor', () => {
    const points = [
      { id: 'a', lat: 33.75, lng: -84.39 },
      { id: 'c', lat: 33.9, lng: -84.5 },
      { id: 'b', lat: 33.78, lng: -84.41 },
    ];
    const ordered = nearestNeighborOrder(points);
    expect(ordered.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('uses optional start for nearest neighbor', () => {
    const points = [
      { id: 'far', lat: 34.0, lng: -84.6 },
      { id: 'near', lat: 33.76, lng: -84.4 },
    ];
    const ordered = nearestNeighborOrder(points, { lat: 33.75, lng: -84.39 });
    expect(ordered[0]?.id).toBe('near');
    expect(ordered[1]?.id).toBe('far');
  });

  it('estimates travel minutes at 25 mph', () => {
    expect(travelMinutesFromMiles(25)).toBe(60);
    expect(travelMinutesFromMiles(12.5)).toBe(30);
  });

  it('sums path segment distances', () => {
    const pts = [
      { lat: 33.75, lng: -84.39 },
      { lat: 33.78, lng: -84.41 },
      { lat: 33.9, lng: -84.5 },
    ];
    const total = pathDistanceMiles(pts);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeCloseTo(
      haversineMiles(pts[0]!.lat, pts[0]!.lng, pts[1]!.lat, pts[1]!.lng) +
        haversineMiles(pts[1]!.lat, pts[1]!.lng, pts[2]!.lat, pts[2]!.lng),
      5,
    );
  });
});

import { MOCK_BUS_STOPS } from '@/api/mock/busStops';
import type { BusStop } from '@/api/types';
import { nearestStops } from '@/lib/busStopDb';

/** Bugis Cube, one of the stops in the fixture. */
const BUGIS = { lat: 1.29820784, lng: 103.85549302 };

describe('nearestStops', () => {
  it('puts the closest stop first', () => {
    const result = nearestStops(MOCK_BUS_STOPS, BUGIS);

    expect(result[0].code).toBe('01039');
    expect(result[0].distanceMetres).toBeCloseTo(0, 1);
  });

  it('returns stops in ascending distance order', () => {
    const distances = nearestStops(MOCK_BUS_STOPS, BUGIS).map((s) => s.distanceMetres);
    const sorted = [...distances].sort((a, b) => a - b);

    expect(distances).toEqual(sorted);
  });

  it('honours the result limit', () => {
    expect(nearestStops(MOCK_BUS_STOPS, BUGIS, 3)).toHaveLength(3);
  });

  it('excludes stops beyond the radius', () => {
    // Raffles Place is ~1.9 km from Bugis, so a 500 m radius must exclude it.
    const result = nearestStops(MOCK_BUS_STOPS, BUGIS, 20, 500);

    expect(result.every((stop) => stop.distanceMetres <= 500)).toBe(true);
    expect(result.map((stop) => stop.code)).not.toContain('03217');
  });

  it('is empty when nothing is in range', () => {
    // Jurong East, far from every stop in the fixture.
    expect(nearestStops(MOCK_BUS_STOPS, { lat: 1.33303, lng: 103.74213 }, 8, 1200)).toEqual([]);
  });

  it('is empty for an empty database rather than throwing', () => {
    expect(nearestStops([], BUGIS)).toEqual([]);
  });

  it('does not drop a stop that sits just inside the radius', () => {
    // A single stop 100 m north of the origin: ~0.0009 degrees of latitude.
    const stop: BusStop = {
      code: 'TEST1',
      roadName: 'Test Rd',
      description: 'Test Stop',
      lat: BUGIS.lat + 0.0009,
      lng: BUGIS.lng,
    };

    const result = nearestStops([stop], BUGIS, 8, 150);
    expect(result).toHaveLength(1);
    expect(result[0].distanceMetres).toBeGreaterThan(90);
    expect(result[0].distanceMetres).toBeLessThan(110);
  });
});

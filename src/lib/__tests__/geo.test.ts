import { boundsOf, decodePolyline, formatDistance, haversineMetres } from '@/lib/geo';

describe('haversineMetres', () => {
  it('measures a known one-degree-hundredth of latitude', () => {
    // 0.01 degrees of latitude is ~1111.9 m anywhere on the globe.
    const d = haversineMetres({ lat: 1.3, lng: 103.8 }, { lat: 1.31, lng: 103.8 });
    expect(d).toBeCloseTo(1111.9, 0);
  });

  it('is zero for the same point', () => {
    expect(haversineMetres({ lat: 1.3521, lng: 103.8198 }, { lat: 1.3521, lng: 103.8198 })).toBe(0);
  });

  it('is symmetric', () => {
    const a = { lat: 1.28376, lng: 103.85152 }; // Raffles Place MRT
    const b = { lat: 1.29319, lng: 103.85224 }; // City Hall MRT
    expect(haversineMetres(a, b)).toBeCloseTo(haversineMetres(b, a), 6);
  });

  it('gets a real Singapore distance about right', () => {
    // Raffles Place to City Hall is a little over 1 km on the map.
    const d = haversineMetres(
      { lat: 1.28376, lng: 103.85152 },
      { lat: 1.29319, lng: 103.85224 },
    );
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1100);
  });
});

describe('decodePolyline', () => {
  it('decodes the canonical encoded-polyline fixture', () => {
    // Google's documented example, which OneMap's legGeometry uses too.
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(points).toHaveLength(3);
    expect(points[0].lat).toBeCloseTo(38.5, 5);
    expect(points[0].lng).toBeCloseTo(-120.2, 5);
    expect(points[1].lat).toBeCloseTo(40.7, 5);
    expect(points[1].lng).toBeCloseTo(-120.95, 5);
    expect(points[2].lat).toBeCloseTo(43.252, 5);
    expect(points[2].lng).toBeCloseTo(-126.453, 5);
  });

  it('returns nothing for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});

describe('formatDistance', () => {
  it('uses metres below a kilometre, rounded to the nearest ten', () => {
    expect(formatDistance(243)).toBe('240 m');
    expect(formatDistance(0)).toBe('0 m');
  });

  it('switches to kilometres at and above 1000 m', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
    expect(formatDistance(1440)).toBe('1.4 km');
  });
});

describe('boundsOf', () => {
  it('encloses every point', () => {
    const b = boundsOf([
      { lat: 1.3, lng: 103.8 },
      { lat: 1.4, lng: 103.7 },
      { lat: 1.2, lng: 103.9 },
    ])!;
    expect(b.sw).toEqual({ lat: 1.2, lng: 103.7 });
    expect(b.ne).toEqual({ lat: 1.4, lng: 103.9 });
  });

  it('is null when there are no points', () => {
    expect(boundsOf([])).toBeNull();
  });
});

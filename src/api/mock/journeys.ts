import type { GeocodeResult, Journey } from '@/api/types';

/**
 * Stand-in geocoding results for mock mode. Real coordinates, so the map and
 * distance calculations behave sensibly.
 */
export const MOCK_PLACES: GeocodeResult[] = [
  {
    name: 'BUGIS MRT STATION (EW12 / DT14)',
    address: '190 VICTORIA STREET SINGAPORE 188021',
    postal: '188021',
    lat: 1.30045,
    lng: 103.85582,
  },
  {
    name: 'CITY HALL MRT STATION (EW13 / NS25)',
    address: '70 NORTH BRIDGE ROAD SINGAPORE 179104',
    postal: '179104',
    lat: 1.29319,
    lng: 103.85224,
  },
  {
    name: 'RAFFLES PLACE MRT STATION (EW14 / NS26)',
    address: '5 RAFFLES PLACE SINGAPORE 048618',
    postal: '048618',
    lat: 1.28376,
    lng: 103.85152,
  },
  {
    name: 'JURONG EAST MRT STATION (EW24 / NS1)',
    address: '10 JURONG EAST STREET 12 SINGAPORE 609690',
    postal: '609690',
    lat: 1.33303,
    lng: 103.74213,
  },
  {
    name: 'CHANGI AIRPORT MRT STATION (CG2)',
    address: '80 AIRPORT BOULEVARD SINGAPORE 819642',
    postal: '819642',
    lat: 1.35737,
    lng: 103.98876,
  },
  {
    name: 'MARINA BAY SANDS',
    address: '10 BAYFRONT AVENUE SINGAPORE 018956',
    postal: '018956',
    lat: 1.28353,
    lng: 103.86063,
  },
  {
    name: 'ORCHARD MRT STATION (NS22 / TE14)',
    address: '437 ORCHARD ROAD SINGAPORE 238878',
    postal: '238878',
    lat: 1.30422,
    lng: 103.83197,
  },
  {
    name: 'SINGAPORE ZOO',
    address: '80 MANDAI LAKE ROAD SINGAPORE 729826',
    postal: '729826',
    lat: 1.40434,
    lng: 103.79302,
  },
];

/**
 * Two plausible itineraries from Bugis to Raffles Place, one train-based and one
 * bus-based, generated relative to the requested departure time so the clock
 * always looks sensible.
 *
 * Paths are explicit coordinates rather than encoded polylines because mock mode
 * returns already-normalised journeys; polyline decoding is exercised by the
 * unit tests in `src/lib/__tests__/geo.test.ts`.
 */
export function MOCK_JOURNEYS(departAtMs: number): Journey[] {
  const min = 60_000;

  const trainJourney: Journey = {
    id: 'mock-train',
    startMs: departAtMs,
    endMs: departAtMs + 16 * min,
    durationSec: 16 * 60,
    walkSec: 7 * 60,
    waitSec: 2 * 60,
    transitSec: 7 * 60,
    walkMetres: 520,
    transfers: 0,
    fare: '1.19',
    legs: [
      {
        mode: 'WALK',
        routeName: null,
        routeLongName: null,
        startMs: departAtMs,
        endMs: departAtMs + 4 * min,
        durationSec: 4 * 60,
        distanceMetres: 300,
        from: { name: 'Your location', lat: 1.29821, lng: 103.85549, stopCode: null },
        to: { name: 'Bugis MRT (EW12)', lat: 1.30045, lng: 103.85582, stopCode: 'EW12' },
        path: [
          { lat: 1.29821, lng: 103.85549 },
          { lat: 1.29915, lng: 103.85566 },
          { lat: 1.30045, lng: 103.85582 },
        ],
        numStops: null,
        scheduledOnly: false,
      },
      {
        mode: 'SUBWAY',
        routeName: 'EW',
        routeLongName: 'East West Line',
        startMs: departAtMs + 6 * min,
        endMs: departAtMs + 13 * min,
        durationSec: 7 * 60,
        distanceMetres: 2400,
        from: { name: 'Bugis MRT (EW12)', lat: 1.30045, lng: 103.85582, stopCode: 'EW12' },
        to: { name: 'Raffles Place MRT (EW14)', lat: 1.28376, lng: 103.85152, stopCode: 'EW14' },
        path: [
          { lat: 1.30045, lng: 103.85582 },
          { lat: 1.29319, lng: 103.85224 },
          { lat: 1.28376, lng: 103.85152 },
        ],
        numStops: 2,
        scheduledOnly: true,
      },
      {
        mode: 'WALK',
        routeName: null,
        routeLongName: null,
        startMs: departAtMs + 13 * min,
        endMs: departAtMs + 16 * min,
        durationSec: 3 * 60,
        distanceMetres: 220,
        from: { name: 'Raffles Place MRT (EW14)', lat: 1.28376, lng: 103.85152, stopCode: 'EW14' },
        to: { name: 'Destination', lat: 1.28237, lng: 103.85073, stopCode: null },
        path: [
          { lat: 1.28376, lng: 103.85152 },
          { lat: 1.28237, lng: 103.85073 },
        ],
        numStops: null,
        scheduledOnly: false,
      },
    ],
  };

  const busJourney: Journey = {
    id: 'mock-bus',
    startMs: departAtMs,
    endMs: departAtMs + 23 * min,
    durationSec: 23 * 60,
    walkSec: 5 * 60,
    waitSec: 4 * 60,
    transitSec: 14 * 60,
    walkMetres: 380,
    transfers: 0,
    fare: '1.09',
    legs: [
      {
        mode: 'WALK',
        routeName: null,
        routeLongName: null,
        startMs: departAtMs,
        endMs: departAtMs + 2 * min,
        durationSec: 2 * 60,
        distanceMetres: 160,
        from: { name: 'Your location', lat: 1.29821, lng: 103.85549, stopCode: null },
        to: { name: 'Bugis Cube', lat: 1.29821, lng: 103.85549, stopCode: '01039' },
        path: [
          { lat: 1.29821, lng: 103.85549 },
          { lat: 1.29821, lng: 103.85549 },
        ],
        numStops: null,
        scheduledOnly: false,
      },
      {
        mode: 'BUS',
        routeName: '133',
        routeLongName: null,
        startMs: departAtMs + 6 * min,
        endMs: departAtMs + 20 * min,
        durationSec: 14 * 60,
        distanceMetres: 3100,
        from: { name: 'Bugis Cube', lat: 1.29821, lng: 103.85549, stopCode: '01039' },
        to: { name: 'Opp Raffles Place', lat: 1.28237, lng: 103.85073, stopCode: '03217' },
        path: [
          { lat: 1.29821, lng: 103.85549 },
          { lat: 1.29337, lng: 103.85177 },
          { lat: 1.28622, lng: 103.85312 },
          { lat: 1.28237, lng: 103.85073 },
        ],
        numStops: 6,
        scheduledOnly: false,
      },
      {
        mode: 'WALK',
        routeName: null,
        routeLongName: null,
        startMs: departAtMs + 20 * min,
        endMs: departAtMs + 23 * min,
        durationSec: 3 * 60,
        distanceMetres: 220,
        from: { name: 'Opp Raffles Place', lat: 1.28237, lng: 103.85073, stopCode: '03217' },
        to: { name: 'Destination', lat: 1.28353, lng: 103.86063, stopCode: null },
        path: [
          { lat: 1.28237, lng: 103.85073 },
          { lat: 1.28353, lng: 103.86063 },
        ],
        numStops: null,
        scheduledOnly: false,
      },
    ],
  };

  return [trainJourney, busJourney];
}

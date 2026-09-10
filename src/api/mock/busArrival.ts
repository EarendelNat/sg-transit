import type { BusLoad, ServiceArrivals } from '@/api/types';

/**
 * Synthesises plausible live arrivals for a stop.
 *
 * Times are generated relative to the moment of the call so countdowns actually
 * tick down in mock mode, and the seed is derived from the stop code so a given
 * stop looks consistent between refreshes rather than shuffling randomly.
 */
export function mockArrivals(stopCode: string, now = Date.now()): ServiceArrivals[] {
  const seed = [...stopCode].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const loads: BusLoad[] = ['seats', 'standing', 'limited'];

  const services = ['2', '12', '33', '133', '857', 'NR7'].slice(0, 3 + (seed % 4));

  return services.map((serviceNo, i) => {
    // Spread first arrivals across the next ~12 minutes, then a headway apart.
    const first = ((seed + i * 137) % 700) + 20;
    const headway = 240 + ((seed + i * 53) % 420);

    return {
      serviceNo,
      operator: ['SBST', 'SMRT', 'TTS', 'GAS'][(seed + i) % 4],
      buses: [0, 1, 2].map((n) => ({
        arrivalMs: now + (first + n * headway) * 1000,
        monitored: true,
        position: {
          lat: 1.2968 + ((seed + i + n) % 20) * 0.001,
          lng: 103.8525 + ((seed + i * 3 + n) % 20) * 0.001,
        },
        load: loads[(seed + i + n) % 3],
        wheelchairAccessible: (seed + i) % 3 !== 0,
        doubleDeck: (seed + i + n) % 5 === 0,
      })),
    };
  });
}

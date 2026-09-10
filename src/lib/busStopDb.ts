/**
 * Local cache of the LTA bus stop database.
 *
 * Two reasons this exists rather than calling the API directly:
 *
 *  1. The arrival endpoint returns bus stop *codes* only, so stop names have to
 *     come from somewhere.
 *  2. Finding the nearest stops means scanning every stop, which needs the whole
 *     dataset on hand. That is ~5,000 records over ~10 paginated requests, far
 *     too slow to repeat on each app launch.
 *
 * So the dataset is fetched once, persisted, and refreshed monthly.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchAllBusStops } from '@/api/lta';
import type { BusStop, NearbyStop } from '@/api/types';
import { haversineMetres, type LatLng } from '@/lib/geo';

const STORAGE_KEY = 'sg-transit/bus-stops/v1';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type CachedPayload = {
  fetchedAtMs: number;
  stops: BusStop[];
};

/** In-process cache, so repeated lookups in one session touch no storage. */
let memoryCache: BusStop[] | null = null;
/** Shared promise, so concurrent screens trigger only one network fetch. */
let inFlight: Promise<BusStop[]> | null = null;

async function readCache(): Promise<CachedPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedPayload;
    if (!Array.isArray(parsed.stops) || parsed.stops.length === 0) return null;

    return parsed;
  } catch {
    // Corrupt or unreadable cache is not worth surfacing — just refetch.
    return null;
  }
}

async function writeCache(stops: BusStop[]): Promise<void> {
  try {
    const payload: CachedPayload = { fetchedAtMs: Date.now(), stops };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // A failed write only costs us the cache next launch.
  }
}

/**
 * All bus stops, from memory, then storage, then the network.
 *
 * A stale cache is still returned immediately and refreshed in the background,
 * so a month-old cache never blocks the Nearby screen on ten HTTP requests.
 */
export async function getBusStops(): Promise<BusStop[]> {
  if (memoryCache) return memoryCache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const cached = await readCache();

    if (cached) {
      memoryCache = cached.stops;

      if (Date.now() - cached.fetchedAtMs > MAX_AGE_MS) {
        // Refresh behind the user's back; ignore failures.
        void fetchAllBusStops()
          .then((fresh) => {
            if (fresh.length > 0) {
              memoryCache = fresh;
              return writeCache(fresh);
            }
          })
          .catch(() => undefined);
      }

      return cached.stops;
    }

    const fresh = await fetchAllBusStops();
    memoryCache = fresh;
    await writeCache(fresh);
    return fresh;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** One stop by code, or null when the code is unknown to the cached dataset. */
export async function getBusStop(code: string): Promise<BusStop | null> {
  const stops = await getBusStops();
  return stops.find((stop) => stop.code === code) ?? null;
}

/**
 * The `limit` closest stops to a point, nearest first.
 *
 * A full scan over ~5,000 stops is a fraction of a millisecond, so there is no
 * need for a spatial index here — but a coarse bounding-box filter is applied
 * first to keep the number of trigonometric calls small.
 */
export function nearestStops(
  stops: BusStop[],
  origin: LatLng,
  limit = 8,
  radiusMetres = 1200,
): NearbyStop[] {
  // ~111 km per degree of latitude; longitude shrinks by cos(lat), but at
  // Singapore's latitude that factor is ~0.9998, so treating it as 1 is fine.
  const degrees = radiusMetres / 111_000;

  return stops
    .filter(
      (stop) =>
        Math.abs(stop.lat - origin.lat) <= degrees && Math.abs(stop.lng - origin.lng) <= degrees,
    )
    .map((stop) => ({
      ...stop,
      distanceMetres: haversineMetres(origin, { lat: stop.lat, lng: stop.lng }),
    }))
    .filter((stop) => stop.distanceMetres <= radiusMetres)
    .sort((a, b) => a.distanceMetres - b.distanceMetres)
    .slice(0, limit);
}

/** Clears both cache layers. Exposed for a "refresh stop data" action. */
export async function clearBusStopCache(): Promise<void> {
  memoryCache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing useful to do if storage is unavailable.
  }
}

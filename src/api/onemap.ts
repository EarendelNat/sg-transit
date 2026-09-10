/**
 * OneMap client — address search and public transport journey planning.
 *
 * Endpoints verified live on 2026-09-10:
 *   POST /api/auth/post/getToken      -> { access_token, expiry_timestamp }
 *   GET  /api/common/elastic/search   -> geocoding (works without a token)
 *   GET  /api/public/routingsvc/route -> routing (401 without a token)
 *
 * The routing response follows OpenTripPlanner's shape: `plan.itineraries[]`,
 * each with `legs[]`, epoch-millisecond times, and geometry as an encoded
 * polyline.
 */

import { MOCK_JOURNEYS, MOCK_PLACES } from '@/api/mock/journeys';
import type { Journey, JourneyLeg, TransitMode } from '@/api/types';
import type { GeocodeResult } from '@/api/types';
import { ONEMAP_EMAIL, ONEMAP_PASSWORD, USE_MOCK_ONEMAP } from '@/config';
import { decodePolyline, type LatLng } from '@/lib/geo';
import { oneMapDate, oneMapTime } from '@/lib/time';

const BASE = 'https://www.onemap.gov.sg';

export class OneMapError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'OneMapError';
  }
}

/* ---------- token handling ---------- */

/**
 * OneMap tokens last three days, so they must be cached and renewed. Keeping
 * the cache in memory (rather than AsyncStorage) means a token never outlives
 * the process that validated it, which avoids a whole class of stale-token bug;
 * re-fetching once per app launch is cheap.
 */
let tokenCache: { token: string; expiresAtMs: number } | null = null;

/** Renew a minute early rather than racing the expiry. */
const RENEW_MARGIN_MS = 60_000;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAtMs - RENEW_MARGIN_MS) {
    return tokenCache.token;
  }

  const res = await fetch(BASE + '/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ONEMAP_EMAIL, password: ONEMAP_PASSWORD }),
  });

  if (!res.ok) {
    throw new OneMapError(
      'OneMap rejected the sign-in. Check EXPO_PUBLIC_ONEMAP_EMAIL and _PASSWORD.',
      res.status,
    );
  }

  const body = (await res.json()) as { access_token?: string; expiry_timestamp?: string };
  if (!body.access_token) {
    throw new OneMapError('OneMap returned no access token.', 500);
  }

  // expiry_timestamp is unix *seconds* as a string. Fall back to three days.
  const expirySec = Number.parseInt(body.expiry_timestamp ?? '', 10);
  const expiresAtMs = Number.isFinite(expirySec)
    ? expirySec * 1000
    : Date.now() + 3 * 24 * 60 * 60 * 1000;

  tokenCache = { token: body.access_token, expiresAtMs };
  return tokenCache.token;
}

/** Drops the cached token so the next call signs in again. */
export function invalidateToken(): void {
  tokenCache = null;
}

/* ---------- geocoding ---------- */

type RawSearchResult = {
  SEARCHVAL?: string;
  ADDRESS?: string;
  POSTAL?: string;
  LATITUDE?: string;
  LONGITUDE?: string;
};

/**
 * Address, building and postal code search. This endpoint needs no token, so
 * the "where from / where to" box works even before credentials are set up.
 */
export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  if (USE_MOCK_ONEMAP) {
    const needle = trimmed.toLowerCase();
    return MOCK_PLACES.filter((place) => place.name.toLowerCase().includes(needle)).slice(0, 8);
  }

  const url = new URL(BASE + '/api/common/elastic/search');
  url.searchParams.set('searchVal', trimmed);
  url.searchParams.set('returnGeom', 'Y');
  url.searchParams.set('getAddrDetails', 'Y');
  url.searchParams.set('pageNum', '1');

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new OneMapError('Address search failed (' + res.status + ')', res.status);
  }

  const body = (await res.json()) as { results?: RawSearchResult[] };

  return (body.results ?? [])
    .map((row) => ({
      name: row.SEARCHVAL ?? '',
      address: row.ADDRESS ?? '',
      postal: row.POSTAL && row.POSTAL !== 'NIL' ? row.POSTAL : null,
      lat: Number.parseFloat(row.LATITUDE ?? ''),
      lng: Number.parseFloat(row.LONGITUDE ?? ''),
    }))
    .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
    .slice(0, 8);
}

/* ---------- journey planning ---------- */

type RawLeg = {
  mode?: string;
  route?: string;
  routeShortName?: string;
  routeLongName?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  distance?: number;
  numStops?: number;
  from?: { name?: string; lat?: number; lon?: number; stopCode?: string };
  to?: { name?: string; lat?: number; lon?: number; stopCode?: string };
  legGeometry?: { points?: string };
};

type RawItinerary = {
  duration?: number;
  startTime?: number;
  endTime?: number;
  walkTime?: number;
  transitTime?: number;
  waitingTime?: number;
  walkDistance?: number;
  transfers?: number;
  fare?: string;
  legs?: RawLeg[];
};

type RawRouteResponse = {
  plan?: { itineraries?: RawItinerary[] };
  error?: string;
};

function toMode(raw: string | undefined): TransitMode {
  switch (raw) {
    case 'WALK':
      return 'WALK';
    case 'BUS':
      return 'BUS';
    case 'SUBWAY':
      return 'SUBWAY';
    case 'RAIL':
      return 'RAIL';
    case 'TRAM':
      return 'TRAM';
    default:
      return 'OTHER';
  }
}

/**
 * Train modes carry no live vehicle data in Singapore, so anything on rails is
 * flagged as scheduled-only and the UI labels its times as estimates.
 */
function isScheduledOnly(mode: TransitMode): boolean {
  return mode === 'SUBWAY' || mode === 'RAIL' || mode === 'TRAM';
}

function toLeg(raw: RawLeg): JourneyLeg {
  const mode = toMode(raw.mode);

  return {
    mode,
    routeName: raw.routeShortName || raw.route || null,
    routeLongName: raw.routeLongName ?? null,
    startMs: raw.startTime ?? 0,
    endMs: raw.endTime ?? 0,
    durationSec: Math.round(raw.duration ?? 0),
    distanceMetres: Math.round(raw.distance ?? 0),
    from: {
      name: raw.from?.name ?? '',
      lat: raw.from?.lat ?? 0,
      lng: raw.from?.lon ?? 0,
      stopCode: raw.from?.stopCode ?? null,
    },
    to: {
      name: raw.to?.name ?? '',
      lat: raw.to?.lat ?? 0,
      lng: raw.to?.lon ?? 0,
      stopCode: raw.to?.stopCode ?? null,
    },
    path: decodePolyline(raw.legGeometry?.points ?? ''),
    numStops: raw.numStops ?? null,
    scheduledOnly: isScheduledOnly(mode),
  };
}

export type PlanOptions = {
  from: LatLng;
  to: LatLng;
  /** Departure time, epoch ms. Defaults to now. */
  departAtMs?: number;
  /** Metres the planner may route you on foot. OneMap default is 1000. */
  maxWalkMetres?: number;
  numItineraries?: number;
};

/**
 * Plans public transport journeys between two points.
 *
 * OneMap's `pt` mode takes a *departure* date and time; there is no arrive-by
 * parameter, so an "arrive by" feature would have to search backwards over
 * candidate departure times.
 */
export async function planJourney(options: PlanOptions): Promise<Journey[]> {
  const departAtMs = options.departAtMs ?? Date.now();

  if (USE_MOCK_ONEMAP) return MOCK_JOURNEYS(departAtMs);

  const token = await getToken();

  const url = new URL(BASE + '/api/public/routingsvc/route');
  url.searchParams.set('start', options.from.lat + ',' + options.from.lng);
  url.searchParams.set('end', options.to.lat + ',' + options.to.lng);
  url.searchParams.set('routeType', 'pt');
  url.searchParams.set('mode', 'TRANSIT');
  url.searchParams.set('date', oneMapDate(departAtMs));
  url.searchParams.set('time', oneMapTime(departAtMs));
  url.searchParams.set('maxWalkDistance', String(options.maxWalkMetres ?? 1000));
  url.searchParams.set('numItineraries', String(options.numItineraries ?? 3));

  const res = await fetch(url.toString(), {
    headers: { Authorization: token },
  });

  if (res.status === 401) {
    // The cached token was rejected — force a fresh sign-in on the next attempt.
    invalidateToken();
    throw new OneMapError('OneMap token was rejected. Retry to sign in again.', 401);
  }
  if (!res.ok) {
    throw new OneMapError('Journey planning failed (' + res.status + ')', res.status);
  }

  const body = (await res.json()) as RawRouteResponse;
  if (body.error) {
    throw new OneMapError(body.error, 400);
  }

  return (body.plan?.itineraries ?? []).map((itinerary, index) => {
    const legs = (itinerary.legs ?? []).map(toLeg);

    return {
      id: 'itinerary-' + index,
      startMs: itinerary.startTime ?? departAtMs,
      endMs: itinerary.endTime ?? departAtMs,
      durationSec: Math.round(itinerary.duration ?? 0),
      walkSec: Math.round(itinerary.walkTime ?? 0),
      waitSec: Math.round(itinerary.waitingTime ?? 0),
      transitSec: Math.round(itinerary.transitTime ?? 0),
      walkMetres: Math.round(itinerary.walkDistance ?? 0),
      transfers: itinerary.transfers ?? Math.max(0, legs.filter((l) => l.mode !== 'WALK').length - 1),
      fare: itinerary.fare ?? null,
      legs,
    };
  });
}

/**
 * Walking time between two points, used by the "can I make it?" verdict.
 *
 * Falls back to `null` when routing is unavailable so callers can drop back to
 * the straight-line estimate in `@/lib/makeItInTime` rather than fail outright.
 */
export async function walkSeconds(from: LatLng, to: LatLng): Promise<number | null> {
  if (USE_MOCK_ONEMAP) return null;

  try {
    const token = await getToken();

    const url = new URL(BASE + '/api/public/routingsvc/route');
    url.searchParams.set('start', from.lat + ',' + from.lng);
    url.searchParams.set('end', to.lat + ',' + to.lng);
    url.searchParams.set('routeType', 'walk');

    const res = await fetch(url.toString(), { headers: { Authorization: token } });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      route_summary?: { total_time?: number };
    };

    const seconds = body.route_summary?.total_time;
    return typeof seconds === 'number' && Number.isFinite(seconds) ? Math.round(seconds) : null;
  } catch {
    // Walk routing is an optimisation, never a hard requirement.
    return null;
  }
}

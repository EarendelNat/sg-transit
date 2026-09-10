/**
 * LTA DataMall client — live bus arrivals, the bus stop database, train service
 * alerts and platform crowding.
 *
 * Endpoint paths were verified live against the gateway on 2026-09-10, after the
 * Aug 2026 DataMall revamp (API guide v6.9). Note the inconsistency, which is
 * easy to get wrong: the real-time arrival endpoint is versioned (`/v3/`) while
 * the static datasets are not. The old `/BusArrivalv2` is retired and 404s.
 *
 * Useful diagnostic: a wrong path returns 404 "The requested API was not found",
 * whereas a valid path with a bad key returns 401. So a 404 means LTA moved the
 * endpoint; a 401 means check EXPO_PUBLIC_LTA_ACCOUNT_KEY.
 */

import { mockArrivals } from '@/api/mock/busArrival';
import { MOCK_BUS_STOPS } from '@/api/mock/busStops';
import { MOCK_STATION_CROWD, MOCK_TRAIN_ALERT } from '@/api/mock/trainAlerts';
import type {
  ArrivingBus,
  BusLoad,
  BusStop,
  CrowdLevel,
  RawBusArrivalResponse,
  RawNextBus,
  ServiceArrivals,
  StationCrowd,
  TrainAlert,
} from '@/api/types';
import { LTA_ACCOUNT_KEY, USE_MOCK_LTA } from '@/config';
import { parseArrival } from '@/lib/time';

const BASE = 'https://datamall2.mytransport.sg/ltaodataservice';

/** Static datasets are served 500 records at a time via a $skip offset. */
const PAGE_SIZE = 500;

export class LtaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'LtaError';
  }
}

async function ltaFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: { AccountKey: LTA_ACCOUNT_KEY, Accept: 'application/json' },
  });

  if (res.status === 401) {
    throw new LtaError('LTA rejected the account key. Check EXPO_PUBLIC_LTA_ACCOUNT_KEY.', 401);
  }
  if (res.status === 404) {
    throw new LtaError(
      'LTA has no endpoint at ' + path + '. The API changed in Aug 2026 — re-check the path.',
      404,
    );
  }
  if (!res.ok) {
    throw new LtaError('LTA request failed (' + res.status + ')', res.status);
  }

  return (await res.json()) as T;
}

/* ---------- bus arrivals ---------- */

function toLoad(raw: RawNextBus['Load']): BusLoad {
  switch (raw) {
    case 'SEA':
      return 'seats';
    case 'SDA':
      return 'standing';
    case 'LSD':
      return 'limited';
    default:
      return 'unknown';
  }
}

function toArrivingBus(raw: RawNextBus | undefined): ArrivingBus | null {
  if (!raw) return null;

  const lat = Number.parseFloat(raw.Latitude ?? '');
  const lng = Number.parseFloat(raw.Longitude ?? '');
  // LTA sends zeroed coordinates when it has no fix, which would plot at sea.
  const hasFix = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

  return {
    arrivalMs: parseArrival(raw.EstimatedArrival),
    monitored: raw.Monitored === 1,
    position: hasFix ? { lat, lng } : null,
    load: toLoad(raw.Load),
    wheelchairAccessible: raw.Feature === 'WAB',
    doubleDeck: raw.Type === 'DD',
  };
}

/**
 * Flattens LTA's NextBus / NextBus2 / NextBus3 triple into an array. Tolerates
 * a plain array as well, in case a later revision changes the shape.
 */
function normaliseArrivals(res: RawBusArrivalResponse): ServiceArrivals[] {
  return (res.Services ?? []).map((svc) => {
    const nextBusField = (svc as { NextBus?: unknown }).NextBus;
    const candidates = Array.isArray(nextBusField)
      ? (nextBusField as RawNextBus[])
      : [svc.NextBus, svc.NextBus2, svc.NextBus3];

    return {
      serviceNo: svc.ServiceNo,
      operator: svc.Operator ?? '',
      buses: candidates
        .map(toArrivingBus)
        .filter((bus): bus is ArrivingBus => bus !== null && bus.arrivalMs !== null),
    };
  });
}

/** Live arrivals for every service calling at one stop, soonest service first. */
export async function getBusArrivals(stopCode: string): Promise<ServiceArrivals[]> {
  if (USE_MOCK_LTA) return mockArrivals(stopCode);

  const res = await ltaFetch<RawBusArrivalResponse>('/v3/BusArrival', {
    BusStopCode: stopCode,
  });

  return normaliseArrivals(res)
    .filter((service) => service.buses.length > 0)
    .sort((a, b) => (a.buses[0].arrivalMs ?? 0) - (b.buses[0].arrivalMs ?? 0));
}

/* ---------- static bus stop database ---------- */

type RawBusStop = {
  BusStopCode: string;
  RoadName: string;
  Description: string;
  Latitude: number;
  Longitude: number;
};

/**
 * Downloads the whole bus stop database by walking the $skip pages until a
 * short page signals the end — roughly 5,000 stops over about ten requests.
 * Callers should cache this rather than repeat it; see `@/lib/busStopDb`.
 */
export async function fetchAllBusStops(): Promise<BusStop[]> {
  if (USE_MOCK_LTA) return MOCK_BUS_STOPS;

  const stops: BusStop[] = [];

  for (let skip = 0; skip <= 20_000; skip += PAGE_SIZE) {
    const page = await ltaFetch<{ value?: RawBusStop[] }>('/BusStops', {
      $skip: String(skip),
    });
    const rows = page.value ?? [];

    for (const row of rows) {
      stops.push({
        code: row.BusStopCode,
        roadName: row.RoadName,
        description: row.Description,
        lat: row.Latitude,
        lng: row.Longitude,
      });
    }

    // A short page means the end. The loop bound above is a backstop in case
    // the endpoint ever ignores $skip and would otherwise spin forever.
    if (rows.length < PAGE_SIZE) break;
  }

  return stops;
}

/* ---------- train alerts and crowding ---------- */

type RawTrainAlerts = {
  value?: {
    Status?: number;
    AffectedSegments?: { Line?: string; Direction?: string; Stations?: string }[];
    Message?: { Content?: string; CreatedDate?: string }[];
  };
};

/** MRT/LRT disruption status. Status 1 means every line is running normally. */
export async function getTrainAlerts(): Promise<TrainAlert> {
  if (USE_MOCK_LTA) return MOCK_TRAIN_ALERT;

  const res = await ltaFetch<RawTrainAlerts>('/TrainServiceAlerts');
  const value = res.value ?? {};

  const lines = (value.AffectedSegments ?? [])
    .map((segment) => segment.Line ?? '')
    .filter((line) => line.length > 0);

  return {
    normal: value.Status === 1,
    messages: (value.Message ?? [])
      .map((message) => message.Content ?? '')
      .filter((content) => content.length > 0),
    affectedLines: [...new Set(lines)],
  };
}

type RawCrowd = {
  value?: { Station?: string; CrowdLevel?: string }[];
};

function toCrowdLevel(raw: string | undefined): CrowdLevel {
  switch (raw) {
    case 'l':
      return 'low';
    case 'm':
      return 'moderate';
    case 'h':
      return 'high';
    default:
      return 'unknown';
  }
}

/** Line codes accepted by the crowd density endpoints. */
export const TRAIN_LINES = [
  'NSL',
  'EWL',
  'CGL',
  'CCL',
  'DTL',
  'NEL',
  'BPL',
  'SLRT',
  'PLRT',
  'TEL',
] as const;

export type TrainLine = (typeof TRAIN_LINES)[number];

/** Real-time platform crowding for one line. LTA refreshes it every 10 minutes. */
export async function getStationCrowd(line: TrainLine): Promise<StationCrowd[]> {
  if (USE_MOCK_LTA) return MOCK_STATION_CROWD;

  const res = await ltaFetch<RawCrowd>('/PCDRealTime', { TrainLine: line });

  return (res.value ?? []).map((row) => ({
    stationCode: row.Station ?? '',
    level: toCrowdLevel(row.CrowdLevel),
  }));
}

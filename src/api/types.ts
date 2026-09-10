import type { LatLng } from '@/lib/geo';

/* ---------- LTA DataMall ---------- */

/** Raw shape of one arriving bus in `GET /ltaodataservice/v3/BusArrival`. */
export type RawNextBus = {
  OriginCode?: string;
  DestinationCode?: string;
  EstimatedArrival?: string;
  Monitored?: number;
  Latitude?: string;
  Longitude?: string;
  VisitNumber?: string;
  /** SEA = seats available, SDA = standing available, LSD = limited standing. */
  Load?: 'SEA' | 'SDA' | 'LSD' | '';
  /** "WAB" when the bus is wheelchair accessible. */
  Feature?: 'WAB' | '';
  /** SD = single deck, DD = double deck, BD = bendy. */
  Type?: 'SD' | 'DD' | 'BD' | '';
};

export type RawBusService = {
  ServiceNo: string;
  Operator?: string;
  NextBus?: RawNextBus;
  NextBus2?: RawNextBus;
  NextBus3?: RawNextBus;
};

export type RawBusArrivalResponse = {
  BusStopCode?: string;
  Services?: RawBusService[];
};

export type BusLoad = 'seats' | 'standing' | 'limited' | 'unknown';

/** One arriving bus, normalised for the UI. */
export type ArrivingBus = {
  /** Epoch ms, or null when LTA reports no estimate (service not operating). */
  arrivalMs: number | null;
  /** Whether the estimate is GPS-derived (true) or schedule-derived. */
  monitored: boolean;
  position: LatLng | null;
  load: BusLoad;
  wheelchairAccessible: boolean;
  doubleDeck: boolean;
};

/** All arrivals for one service at one stop. */
export type ServiceArrivals = {
  serviceNo: string;
  operator: string;
  buses: ArrivingBus[];
};

export type BusStop = {
  code: string;
  roadName: string;
  description: string;
  lat: number;
  lng: number;
};

/** A bus stop with its distance from the user, used by the Nearby screen. */
export type NearbyStop = BusStop & { distanceMetres: number };

export type TrainAlert = {
  /** true when every line is running normally. */
  normal: boolean;
  messages: string[];
  affectedLines: string[];
};

export type CrowdLevel = 'low' | 'moderate' | 'high' | 'unknown';

export type StationCrowd = {
  stationCode: string;
  level: CrowdLevel;
};

/* ---------- OneMap ---------- */

export type GeocodeResult = {
  /** Display name, e.g. "JURONG EAST MRT STATION (EW24 / NS1)". */
  name: string;
  address: string;
  postal: string | null;
  lat: number;
  lng: number;
};

export type TransitMode = 'WALK' | 'BUS' | 'SUBWAY' | 'RAIL' | 'TRAM' | 'OTHER';

/** One stage of a journey: a walk, a bus ride, or a train ride. */
export type JourneyLeg = {
  mode: TransitMode;
  /** Service number for a bus ("15"), or line name for a train ("EW"). */
  routeName: string | null;
  /** Human label, e.g. "East West Line". */
  routeLongName: string | null;
  startMs: number;
  endMs: number;
  durationSec: number;
  distanceMetres: number;
  from: { name: string; lat: number; lng: number; stopCode: string | null };
  to: { name: string; lat: number; lng: number; stopCode: string | null };
  /** Decoded geometry for drawing on the map. */
  path: LatLng[];
  /** Number of stops ridden, when the API supplies it. */
  numStops: number | null;
  /**
   * True for train legs, where Singapore publishes no live vehicle data so the
   * time is scheduled rather than observed. See README.
   */
  scheduledOnly: boolean;
};

export type Journey = {
  id: string;
  startMs: number;
  endMs: number;
  durationSec: number;
  walkSec: number;
  waitSec: number;
  transitSec: number;
  walkMetres: number;
  transfers: number;
  /** Fare in SGD as a string, e.g. "1.55". Null when not supplied. */
  fare: string | null;
  legs: JourneyLeg[];
};

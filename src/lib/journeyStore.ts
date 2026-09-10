/**
 * Hands planned journeys from the Plan screen to the Route detail screen.
 *
 * A journey holds decoded polylines with hundreds of coordinates, which is far
 * too much to serialise through navigation params (and URL params on web). So
 * the route screen receives just an id and reads the object from here.
 *
 * This is intentionally in-memory only: a journey is a snapshot of the timetable
 * at the moment it was planned, so it should not survive an app restart and be
 * mistaken for something current.
 */

import type { Journey } from '@/api/types';
import type { LatLng } from '@/lib/geo';

export type PlannedTrip = {
  journeys: Journey[];
  from: { name: string; point: LatLng };
  to: { name: string; point: LatLng };
  departAtMs: number;
  plannedAtMs: number;
};

let currentTrip: PlannedTrip | null = null;

export function setPlannedTrip(trip: Omit<PlannedTrip, 'plannedAtMs'>): void {
  currentTrip = { ...trip, plannedAtMs: Date.now() };
}

export function getPlannedTrip(): PlannedTrip | null {
  return currentTrip;
}

export function getPlannedJourney(id: string): { trip: PlannedTrip; journey: Journey } | null {
  if (!currentTrip) return null;

  const journey = currentTrip.journeys.find((candidate) => candidate.id === id);
  return journey ? { trip: currentTrip, journey } : null;
}

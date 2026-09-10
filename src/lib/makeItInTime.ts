/**
 * "Can I still make it?" — the feature that needs your live GPS position and a
 * live bus ETA at the same time.
 *
 * Deliberately a pure function: no React, no network, no clock access. `now` is
 * injected so every branch is unit-testable and so the UI can recompute cheaply
 * on each GPS tick without refetching anything.
 */

import { BOARDING_BUFFER_SEC, WALK_DETOUR_FACTOR, WALK_SPEED_MPS } from '@/config';
import type { ArrivingBus } from '@/api/types';
import { haversineMetres, type LatLng } from '@/lib/geo';
import { formatCountdown, formatSpare, secondsUntil } from '@/lib/time';

export type MakeItLevel = 'comfortable' | 'hurry' | 'missed' | 'unknown';

export type CatchOption = {
  bus: ArrivingBus;
  /** Seconds until this bus reaches the stop. */
  leadSec: number;
  /** Seconds you would be waiting at the stop before it arrives. */
  slackSec: number;
  /** `slackSec` minus the boarding buffer. Non-negative means comfortable. */
  spareSec: number;
  level: MakeItLevel;
};

export type MakeItVerdict = {
  /** Verdict for the very next bus — what "can I make it?" usually means. */
  level: MakeItLevel;
  walkSec: number;
  walkMetres: number | null;
  /** The next bus due, whether or not you can reach it. */
  next: CatchOption | null;
  /** Earliest bus you can actually reach. May be the same object as `next`. */
  recommended: CatchOption | null;
  headline: string;
  detail: string;
};

/**
 * Estimated walking time when OneMap walk routing is unavailable (offline, or
 * no credentials). Straight-line distance is inflated by a detour factor
 * because you cannot walk through buildings.
 */
export function estimateWalkSec(from: LatLng, to: LatLng): number {
  const metres = haversineMetres(from, to) * WALK_DETOUR_FACTOR;
  return Math.round(metres / WALK_SPEED_MPS);
}

function classify(slackSec: number): MakeItLevel {
  if (slackSec < 0) return 'missed';
  return slackSec >= BOARDING_BUFFER_SEC ? 'comfortable' : 'hurry';
}

/**
 * @param buses     Arrivals for one service at one stop, as returned by the API.
 * @param walkSec   Seconds to walk from the user to the boarding stop.
 * @param now       Epoch ms. Injected rather than read from the clock.
 * @param walkMetres Optional, for display only.
 */
export function makeItInTime(
  buses: ArrivingBus[],
  walkSec: number,
  now: number,
  walkMetres: number | null = null,
): MakeItVerdict {
  const options: CatchOption[] = buses
    .filter((bus): bus is ArrivingBus & { arrivalMs: number } => bus.arrivalMs !== null)
    .map((bus) => {
      const leadSec = secondsUntil(bus.arrivalMs, now);
      const slackSec = leadSec - walkSec;
      return {
        bus,
        leadSec,
        slackSec,
        spareSec: slackSec - BOARDING_BUFFER_SEC,
        level: classify(slackSec),
      };
    })
    // Buses that have already departed are not choices.
    .filter((o) => o.leadSec > -60)
    .sort((a, b) => a.leadSec - b.leadSec);

  if (options.length === 0) {
    return {
      level: 'unknown',
      walkSec,
      walkMetres,
      next: null,
      recommended: null,
      headline: 'No arrival times',
      detail: 'This service may have stopped running for the day.',
    };
  }

  const next = options[0];
  const recommended = options.find((o) => o.level !== 'missed') ?? null;
  const walkLabel = `${formatSpare(walkSec)} walk`;

  if (next.level === 'comfortable') {
    return {
      level: 'comfortable',
      walkSec,
      walkMetres,
      next,
      recommended,
      headline: "You'll make it",
      detail: `${walkLabel} · ${formatSpare(next.spareSec)} to spare`,
    };
  }

  if (next.level === 'hurry') {
    return {
      level: 'hurry',
      walkSec,
      walkMetres,
      next,
      recommended,
      headline: "Tight — you'll need to hurry",
      detail: `${walkLabel} · arriving ${formatSpare(next.slackSec)} before the bus`,
    };
  }

  // The next bus is out of reach.
  if (recommended) {
    return {
      level: 'missed',
      walkSec,
      walkMetres,
      next,
      recommended,
      headline: `You'll miss the ${formatCountdown(next.leadSec) ?? 'next'} bus`,
      detail: `${walkLabel} · catch the one in ${formatSpare(recommended.leadSec)} instead`,
    };
  }

  return {
    level: 'missed',
    walkSec,
    walkMetres,
    next,
    recommended: null,
    headline: "You won't make it",
    detail: `${walkLabel} · too far for any of the next ${options.length} bus${
      options.length === 1 ? '' : 'es'
    }`,
  };
}

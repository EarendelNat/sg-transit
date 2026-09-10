/**
 * Combines the two live signals — your GPS position and the bus's ETA — into a
 * single "can I make it?" verdict.
 *
 * The arithmetic lives in `@/lib/makeItInTime` as a pure function; this hook
 * only gathers the inputs.
 */

import { useQuery } from '@tanstack/react-query';

import { getBusArrivals } from '@/api/lta';
import { walkSeconds } from '@/api/onemap';
import { ARRIVAL_POLL_MS } from '@/config';
import type { LatLng } from '@/lib/geo';
import { estimateWalkSec, makeItInTime, type MakeItVerdict } from '@/lib/makeItInTime';
import { haversineMetres } from '@/lib/geo';
import { useNow } from '@/hooks/use-now';

export type UseMakeItVerdictArgs = {
  /** Boarding stop code. Null disables the whole hook (e.g. for a train leg). */
  stopCode: string | null;
  stopPoint: LatLng | null;
  /** Restrict to one service, or null to consider whichever bus comes first. */
  serviceNo: string | null;
  /** The user's live position. Null while GPS is resolving. */
  from: LatLng | null;
};

export type MakeItState = {
  verdict: MakeItVerdict | null;
  isLoading: boolean;
  error: Error | null;
  /** True when walking time is a straight-line estimate rather than routed. */
  walkIsEstimated: boolean;
};

export function useMakeItVerdict({
  stopCode,
  stopPoint,
  serviceNo,
  from,
}: UseMakeItVerdictArgs): MakeItState {
  const now = useNow();
  const enabled = stopCode !== null && stopPoint !== null && from !== null;

  const arrivals = useQuery({
    queryKey: ['arrivals', stopCode],
    queryFn: () => getBusArrivals(stopCode as string),
    enabled: stopCode !== null,
    refetchInterval: ARRIVAL_POLL_MS,
  });

  /**
   * Routed walking time, keyed to a coarse position so that ordinary GPS jitter
   * does not trigger a request on every tick. Between refreshes the verdict
   * still updates every second, because only `now` changes.
   */
  const coarseFrom = from ? `${from.lat.toFixed(4)},${from.lng.toFixed(4)}` : 'none';

  const walk = useQuery({
    queryKey: ['walk', coarseFrom, stopCode],
    queryFn: () => walkSeconds(from as LatLng, stopPoint as LatLng),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  if (!enabled) {
    return { verdict: null, isLoading: false, error: null, walkIsEstimated: true };
  }

  // Fall back to the straight-line estimate when routing is unavailable, so a
  // missing OneMap token degrades the accuracy rather than the feature.
  const routedWalkSec = walk.data ?? null;
  const walkSec = routedWalkSec ?? estimateWalkSec(from, stopPoint);
  const walkMetres = haversineMetres(from, stopPoint);

  const services = arrivals.data ?? [];
  const relevant =
    serviceNo === null
      ? services.flatMap((service) => service.buses)
      : (services.find((service) => service.serviceNo === serviceNo)?.buses ?? []);

  return {
    verdict: makeItInTime(relevant, walkSec, now, walkMetres),
    isLoading: arrivals.isLoading || walk.isLoading,
    error: arrivals.error instanceof Error ? arrivals.error : null,
    walkIsEstimated: routedWalkSec === null,
  };
}

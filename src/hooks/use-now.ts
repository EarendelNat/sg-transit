import { useEffect, useState } from 'react';

/**
 * A clock that ticks, so countdowns visibly tick down between network refreshes.
 *
 * Arrival times are fetched every 20 seconds but rendered against this value
 * every second, which is what makes "3 min" become "2 min" without any traffic.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

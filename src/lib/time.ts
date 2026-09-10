/**
 * Time helpers. Singapore has a single fixed offset (+08:00) and no daylight
 * saving, which makes this simpler than it would be elsewhere — but the phone's
 * own clock may be in any zone, so we never format using the local zone.
 */

/**
 * Parses an LTA `EstimatedArrival` timestamp into epoch milliseconds.
 *
 * LTA returns ISO 8601 with an explicit `+08:00` offset, so `Date.parse` gets
 * the instant right regardless of device timezone. Returns null for the empty
 * strings LTA sends when a service is not operating.
 */
export function parseArrival(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/** Whole seconds from `now` until `then`; negative once `then` has passed. */
export function secondsUntil(then: number, now: number): number {
  return Math.round((then - now) / 1000);
}

/**
 * Countdown as shown on a bus stop display: "Arr" when imminent, then minutes.
 * Returns null once the bus has left, so callers can drop it from the list.
 */
export function formatCountdown(seconds: number): string | null {
  if (seconds < -60) return null;
  if (seconds < 60) return 'Arr';
  return `${Math.floor(seconds / 60)} min`;
}

/** Signed duration for the "will I make it" banner: "1 min 20 s spare". */
export function formatSpare(seconds: number): string {
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs}s`;
}

/** A journey duration: "24 min", "1 h 05 min". */
export function formatDuration(seconds: number): string {
  const totalMins = Math.max(0, Math.round(seconds / 60));
  if (totalMins < 60) return `${totalMins} min`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

/** Wall-clock time in Singapore, e.g. "14:07". Device timezone is irrelevant. */
export function formatSgTime(epochMs: number): string {
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(epochMs));
}

/** OneMap routing wants the date as MM-DD-YYYY, in Singapore terms. */
export function oneMapDate(epochMs: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(epochMs));

  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('month')}-${get('day')}-${get('year')}`;
}

/** OneMap routing wants the time as HH:MM:SS, in Singapore terms. */
export function oneMapTime(epochMs: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(epochMs));
}

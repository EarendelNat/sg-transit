import {
  formatCountdown,
  formatDuration,
  formatSgTime,
  formatSpare,
  oneMapDate,
  oneMapTime,
  parseArrival,
  secondsUntil,
} from '@/lib/time';

describe('parseArrival', () => {
  it('honours the explicit +08:00 offset LTA sends', () => {
    // 14:20 in Singapore is 06:20 UTC.
    expect(parseArrival('2026-09-10T14:20:00+08:00')).toBe(Date.UTC(2026, 8, 10, 6, 20, 0));
  });

  it('is null for the empty string LTA sends for non-operating services', () => {
    expect(parseArrival('')).toBeNull();
    expect(parseArrival(undefined)).toBeNull();
    expect(parseArrival(null)).toBeNull();
  });

  it('is null for unparseable junk rather than NaN', () => {
    expect(parseArrival('not a date')).toBeNull();
  });
});

describe('secondsUntil', () => {
  it('is positive before and negative after', () => {
    const now = Date.UTC(2026, 8, 10, 6, 0, 0);
    expect(secondsUntil(now + 90_000, now)).toBe(90);
    expect(secondsUntil(now - 30_000, now)).toBe(-30);
  });
});

describe('formatCountdown', () => {
  it('shows "Arr" for a bus that is essentially here', () => {
    expect(formatCountdown(0)).toBe('Arr');
    expect(formatCountdown(59)).toBe('Arr');
    expect(formatCountdown(-30)).toBe('Arr');
  });

  it('shows whole minutes once further out', () => {
    expect(formatCountdown(60)).toBe('1 min');
    expect(formatCountdown(119)).toBe('1 min');
    expect(formatCountdown(600)).toBe('10 min');
  });

  it('is null once the bus is long gone, so callers can drop it', () => {
    expect(formatCountdown(-61)).toBeNull();
  });
});

describe('formatSpare', () => {
  it('reads naturally across the minute boundary', () => {
    expect(formatSpare(45)).toBe('45s');
    expect(formatSpare(60)).toBe('1 min');
    expect(formatSpare(80)).toBe('1 min 20s');
    expect(formatSpare(-80)).toBe('1 min 20s'); // sign is conveyed by wording
  });
});

describe('formatDuration', () => {
  it('uses minutes under an hour and h+min above', () => {
    expect(formatDuration(1440)).toBe('24 min');
    expect(formatDuration(3900)).toBe('1 h 05 min');
  });
});

describe('Singapore timezone handling', () => {
  // 16:05 UTC is 00:05 the *next* day in Singapore. This is the case that
  // breaks naive implementations relying on the device's local zone.
  const acrossMidnight = Date.UTC(2026, 8, 10, 16, 5, 0);

  it('formats wall-clock time in Singapore, not the device zone', () => {
    expect(formatSgTime(acrossMidnight)).toBe('00:05');
  });

  it('rolls the date over for OneMap in Singapore terms', () => {
    expect(oneMapDate(acrossMidnight)).toBe('09-11-2026');
  });

  it('formats OneMap time as HH:MM:SS', () => {
    expect(oneMapTime(acrossMidnight)).toBe('00:05:00');
  });

  it('uses MM-DD-YYYY, which is what OneMap expects', () => {
    // 10 Sep 2026, 12:00 SGT. Month first, not day first.
    expect(oneMapDate(Date.UTC(2026, 8, 10, 4, 0, 0))).toBe('09-10-2026');
  });
});

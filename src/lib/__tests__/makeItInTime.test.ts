import type { ArrivingBus } from '@/api/types';
import { BOARDING_BUFFER_SEC } from '@/config';
import { estimateWalkSec, makeItInTime } from '@/lib/makeItInTime';

const NOW = Date.UTC(2026, 8, 10, 6, 0, 0);

/** A bus arriving `sec` seconds from NOW. */
const busIn = (sec: number): ArrivingBus => ({
  arrivalMs: NOW + sec * 1000,
  monitored: true,
  position: null,
  load: 'seats',
  wheelchairAccessible: false,
  doubleDeck: false,
});

describe('makeItInTime — verdict boundaries', () => {
  it('is comfortable when slack exactly equals the boarding buffer', () => {
    // Walk 120s, bus in 180s => 60s slack, which is exactly the buffer.
    const v = makeItInTime([busIn(180)], 120, NOW);
    expect(v.level).toBe('comfortable');
    expect(v.next?.slackSec).toBe(BOARDING_BUFFER_SEC);
    expect(v.next?.spareSec).toBe(0);
  });

  it('drops to hurry one second below the buffer', () => {
    const v = makeItInTime([busIn(179)], 120, NOW);
    expect(v.level).toBe('hurry');
    expect(v.next?.spareSec).toBe(-1);
    expect(v.headline).toMatch(/hurry/i);
  });

  it('is comfortable with plenty of time', () => {
    const v = makeItInTime([busIn(600)], 120, NOW);
    expect(v.level).toBe('comfortable');
    expect(v.detail).toContain('to spare');
  });

  it('is missed the moment slack goes negative', () => {
    // Walk 120s, bus in 119s => you arrive one second late.
    const v = makeItInTime([busIn(119)], 120, NOW);
    expect(v.level).toBe('missed');
  });

  it('is still catchable when slack is exactly zero', () => {
    const v = makeItInTime([busIn(120)], 120, NOW);
    expect(v.level).toBe('hurry');
    expect(v.next?.slackSec).toBe(0);
  });
});

describe('makeItInTime — falling back to a later bus', () => {
  it('names the later bus when the imminent one is out of reach', () => {
    // 5 min walk; first bus in 1 min (missed), second in 10 min (comfortable).
    const v = makeItInTime([busIn(60), busIn(600)], 300, NOW);
    expect(v.level).toBe('missed');
    expect(v.next?.leadSec).toBe(60);
    expect(v.recommended?.leadSec).toBe(600);
    expect(v.detail).toMatch(/^5 min walk · catch the one in 10 min instead$/);
  });

  it('reports no option when every bus is out of reach', () => {
    const v = makeItInTime([busIn(60), busIn(120)], 600, NOW);
    expect(v.level).toBe('missed');
    expect(v.recommended).toBeNull();
    expect(v.detail).toMatch(/too far for any of the next 2 buses/);
  });

  it('recommends the same bus it is reporting on when that bus is reachable', () => {
    const v = makeItInTime([busIn(600), busIn(1200)], 120, NOW);
    expect(v.recommended).toBe(v.next);
  });
});

describe('makeItInTime — degenerate data', () => {
  it('is unknown when there are no arrivals at all', () => {
    const v = makeItInTime([], 120, NOW);
    expect(v.level).toBe('unknown');
    expect(v.next).toBeNull();
    expect(v.detail).toMatch(/stopped running/);
  });

  it('is unknown when LTA reports no estimate for the service', () => {
    const noEstimate: ArrivingBus = { ...busIn(0), arrivalMs: null };
    expect(makeItInTime([noEstimate], 120, NOW).level).toBe('unknown');
  });

  it('ignores buses that have already departed', () => {
    const v = makeItInTime([busIn(-120), busIn(600)], 120, NOW);
    expect(v.next?.leadSec).toBe(600);
  });

  it('still counts a bus that is right now at the stop', () => {
    const v = makeItInTime([busIn(-30), busIn(600)], 0, NOW);
    expect(v.next?.leadSec).toBe(-30);
    expect(v.level).toBe('missed');
  });

  it('sorts unordered arrivals so the soonest is judged first', () => {
    const v = makeItInTime([busIn(900), busIn(300)], 60, NOW);
    expect(v.next?.leadSec).toBe(300);
  });

  it('treats a zero walk as standing at the stop', () => {
    const v = makeItInTime([busIn(90)], 0, NOW);
    expect(v.level).toBe('comfortable');
    expect(v.next?.slackSec).toBe(90);
  });
});

describe('estimateWalkSec', () => {
  it('scales with distance and stays in a plausible range', () => {
    const near = { lat: 1.3, lng: 103.8 };
    const far = { lat: 1.31, lng: 103.8 }; // ~1112 m straight line

    // 1112 m * 1.35 detour / 1.25 m/s => ~1200 s, i.e. about 20 minutes.
    const sec = estimateWalkSec(near, far);
    expect(sec).toBeGreaterThan(1000);
    expect(sec).toBeLessThan(1400);
  });

  it('is zero at the same point', () => {
    expect(estimateWalkSec({ lat: 1.3, lng: 103.8 }, { lat: 1.3, lng: 103.8 })).toBe(0);
  });

  it('exceeds the straight-line time because you cannot walk through buildings', () => {
    const a = { lat: 1.3, lng: 103.8 };
    const b = { lat: 1.303, lng: 103.803 };
    const straightLineSec = 470 / 1.25; // ~470 m apart
    expect(estimateWalkSec(a, b)).toBeGreaterThan(straightLineSec);
  });
});

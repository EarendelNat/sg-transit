/**
 * Transit-specific colours, kept separate from the template's `theme.ts` so the
 * base theme stays untouched.
 *
 * The verdict colours carry meaning, so they are also paired with text and an
 * icon everywhere they appear — colour alone would exclude colour-blind users.
 */

import type { MakeItLevel } from '@/lib/makeItInTime';
import type { BusLoad, CrowdLevel, TransitMode } from '@/api/types';

export const Verdict: Record<MakeItLevel, { bg: string; fg: string; icon: string }> = {
  comfortable: { bg: '#e6f4ea', fg: '#0d652d', icon: '✓' },
  hurry: { bg: '#fef7e0', fg: '#8a5300', icon: '!' },
  missed: { bg: '#fce8e6', fg: '#a50e0e', icon: '✕' },
  unknown: { bg: '#f1f3f4', fg: '#5f6368', icon: '–' },
};

export const VerdictDark: Record<MakeItLevel, { bg: string; fg: string; icon: string }> = {
  comfortable: { bg: '#0f2e18', fg: '#81c995', icon: '✓' },
  hurry: { bg: '#332a00', fg: '#fdd663', icon: '!' },
  missed: { bg: '#3b1211', fg: '#f28b82', icon: '✕' },
  unknown: { bg: '#26282b', fg: '#9aa0a6', icon: '–' },
};

/** How full the bus is. LTA reports this per arriving vehicle. */
export const Load: Record<BusLoad, { label: string; color: string }> = {
  seats: { label: 'Seats', color: '#1a7f37' },
  standing: { label: 'Standing', color: '#bf8700' },
  limited: { label: 'Packed', color: '#cf222e' },
  unknown: { label: '', color: '#8c959f' },
};

export const Crowd: Record<CrowdLevel, { label: string; color: string }> = {
  low: { label: 'Not crowded', color: '#1a7f37' },
  moderate: { label: 'Moderate', color: '#bf8700' },
  high: { label: 'Crowded', color: '#cf222e' },
  unknown: { label: 'No data', color: '#8c959f' },
};

/** Official MRT/LRT line colours, keyed by the two-letter line code. */
export const LineColors: Record<string, string> = {
  NS: '#d42e12',
  EW: '#009645',
  CG: '#009645',
  NE: '#9900aa',
  CC: '#fa9e0d',
  CE: '#fa9e0d',
  DT: '#005ec4',
  TE: '#9d5b25',
  JR: '#0099aa',
  CR: '#97c616',
  BP: '#748477',
  SW: '#748477',
  SE: '#748477',
  PW: '#748477',
  PE: '#748477',
};

const MODE_FALLBACK: Record<TransitMode, string> = {
  WALK: '#5f6368',
  BUS: '#1a7f37',
  SUBWAY: '#005ec4',
  RAIL: '#005ec4',
  TRAM: '#748477',
  OTHER: '#5f6368',
};

/**
 * Colour for a journey leg — the real line colour when we can identify the
 * line, otherwise a sensible colour for the mode.
 */
export function legColor(mode: TransitMode, routeName: string | null): string {
  if (mode === 'SUBWAY' || mode === 'RAIL' || mode === 'TRAM') {
    const code = (routeName ?? '').slice(0, 2).toUpperCase();
    return LineColors[code] ?? MODE_FALLBACK[mode];
  }
  return MODE_FALLBACK[mode];
}

export function modeLabel(mode: TransitMode): string {
  switch (mode) {
    case 'WALK':
      return 'Walk';
    case 'BUS':
      return 'Bus';
    case 'SUBWAY':
    case 'RAIL':
      return 'Train';
    case 'TRAM':
      return 'LRT';
    default:
      return 'Transit';
  }
}

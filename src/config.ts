/**
 * Single source of truth for API credentials and runtime mode.
 *
 * Keys come from `.env` via Expo's EXPO_PUBLIC_* convention, which the Expo CLI
 * loads automatically and inlines at bundle time. See `.env.example`.
 *
 * NOTE: EXPO_PUBLIC_* values are embedded in the shipped JS bundle and can be
 * extracted from a distributed app. That is an accepted trade-off for now; every
 * network call is funnelled through `src/api/*` so moving to a server-side proxy
 * later only means changing the base URLs in those two files.
 */

export const LTA_ACCOUNT_KEY = process.env.EXPO_PUBLIC_LTA_ACCOUNT_KEY ?? '';
export const ONEMAP_EMAIL = process.env.EXPO_PUBLIC_ONEMAP_EMAIL ?? '';
export const ONEMAP_PASSWORD = process.env.EXPO_PUBLIC_ONEMAP_PASSWORD ?? '';

/** Live bus arrivals, bus stop database, train alerts and crowding. */
export const hasLtaKey = LTA_ACCOUNT_KEY.length > 0;
/** Journey planning (A-to-B routing). Geocoding works without credentials. */
export const hasOneMapCreds = ONEMAP_EMAIL.length > 0 && ONEMAP_PASSWORD.length > 0;

/**
 * With no credentials the app serves realistic fixtures instead of failing, so
 * every screen is navigable before you have registered for anything.
 */
export const USE_MOCK_LTA = !hasLtaKey;
export const USE_MOCK_ONEMAP = !hasOneMapCreds;

/** How often live bus arrivals are refetched while a screen is focused. */
export const ARRIVAL_POLL_MS = 20_000;

/**
 * Safety margin applied to "can I make it?" verdicts, in seconds. Covers the
 * time to actually board rather than merely arrive alongside the bus.
 */
export const BOARDING_BUFFER_SEC = 60;

/** Assumed walking speed, m/s. ~4.5 km/h, a realistic pace on a hot day. */
export const WALK_SPEED_MPS = 1.25;

/**
 * Straight-line distances underestimate real walking distance because of
 * buildings, roads and overhead bridges. Applied when OneMap walk routing is
 * unavailable.
 */
export const WALK_DETOUR_FACTOR = 1.35;

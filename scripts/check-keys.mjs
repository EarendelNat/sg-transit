/**
 * Verifies the API credentials in `.env` actually work, before you go hunting
 * through the app for the reason something is empty.
 *
 * Run with:  npm run check-keys
 *
 * Checks each credential independently and explains what each failure means,
 * because the two APIs fail in quite different ways: LTA distinguishes a bad
 * key (401) from a moved endpoint (404), while OneMap tokens simply expire
 * every three days.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const pass = (msg) => console.log(`${GREEN}  PASS${RESET}  ${msg}`);
const fail = (msg) => console.log(`${RED}  FAIL${RESET}  ${msg}`);
const skip = (msg) => console.log(`${YELLOW}  SKIP${RESET}  ${msg}`);
const note = (msg) => console.log(`${DIM}        ${msg}${RESET}`);

/** Minimal .env reader — avoids adding a dependency just for this script. */
function readEnv() {
  const env = {};

  try {
    const raw = readFileSync(join(projectRoot, '.env'), 'utf8');

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      // Tolerate quoted values, which are easy to paste in by accident.
      const value = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, '');

      if (value.length > 0) env[key] = value;
    }
  } catch {
    console.log(`${YELLOW}No .env file found.${RESET}`);
    note('Copy .env.example to .env and add your keys, then run this again.');
  }

  return env;
}

async function checkLta(accountKey) {
  console.log('\nLTA DataMall  (live bus arrivals, stops, train alerts)');

  if (!accountKey) {
    skip('EXPO_PUBLIC_LTA_ACCOUNT_KEY is not set — the app will use sample bus data.');
    note('Register free at https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html');
    return;
  }

  // Bus stop 83139 is a real, busy stop, so a working key returns services.
  const url =
    'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=83139';

  try {
    const res = await fetch(url, {
      headers: { AccountKey: accountKey, Accept: 'application/json' },
    });

    if (res.status === 401) {
      fail('LTA rejected the key (401).');
      note('Check for stray spaces or quotes around the value in .env.');
      return;
    }

    if (res.status === 404) {
      fail('LTA has no endpoint at /v3/BusArrival (404).');
      note('The path moved again. On DataMall, 404 = wrong path, 401 = wrong key.');
      return;
    }

    if (!res.ok) {
      fail(`Unexpected status ${res.status}.`);
      return;
    }

    const body = await res.json();
    const services = body.Services ?? [];
    pass(`Key works — stop 83139 returned ${services.length} service(s).`);

    if (services.length === 0) {
      note('No services right now is normal late at night; the key is still valid.');
    } else {
      const first = services[0];
      const eta = first.NextBus?.EstimatedArrival ?? '(none)';
      note(`e.g. service ${first.ServiceNo} next arrives ${eta}`);
    }
  } catch (cause) {
    fail(`Could not reach LTA: ${cause.message}`);
    note('Check your internet connection or any corporate proxy.');
  }
}

async function checkOneMap(email, password) {
  console.log('\nOneMap  (A-to-B journey planning)');

  if (!email || !password) {
    skip('OneMap credentials are not set — the app will use sample journeys.');
    note('Register free at https://www.onemap.gov.sg/apidocs/register');
    note('Address search still works without credentials.');
    return;
  }

  let token;

  try {
    const res = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      fail(`Sign-in failed (${res.status}).`);
      note('Confirm the email is verified — OneMap emails a confirmation link.');
      return;
    }

    const body = await res.json();
    token = body.access_token;

    if (!token) {
      fail('Signed in but no access_token was returned.');
      return;
    }

    const expirySec = Number.parseInt(body.expiry_timestamp ?? '', 10);
    const expiryNote = Number.isFinite(expirySec)
      ? new Date(expirySec * 1000).toISOString()
      : 'unknown';

    pass('Sign-in works — token issued.');
    note(`Token expires ${expiryNote} (OneMap tokens last 3 days; the app renews them).`);
  } catch (cause) {
    fail(`Could not reach OneMap: ${cause.message}`);
    return;
  }

  // A token alone is not proof: routing is a separate entitlement.
  try {
    const url = new URL('https://www.onemap.gov.sg/api/public/routingsvc/route');
    url.searchParams.set('start', '1.30045,103.85582'); // Bugis MRT
    url.searchParams.set('end', '1.28376,103.85152'); // Raffles Place MRT
    url.searchParams.set('routeType', 'pt');
    url.searchParams.set('mode', 'TRANSIT');
    url.searchParams.set('date', '09-10-2026');
    url.searchParams.set('time', '08:30:00');
    url.searchParams.set('maxWalkDistance', '1000');
    url.searchParams.set('numItineraries', '3');

    const res = await fetch(url, { headers: { Authorization: token } });

    if (!res.ok) {
      fail(`Routing rejected the token (${res.status}).`);
      return;
    }

    const body = await res.json();
    const itineraries = body.plan?.itineraries ?? [];

    if (itineraries.length === 0) {
      fail('Routing returned no itineraries for Bugis to Raffles Place.');
      note(body.error ? `API said: ${body.error}` : 'Unexpected — this route normally works.');
      return;
    }

    const minutes = Math.round((itineraries[0].duration ?? 0) / 60);
    pass(`Journey planning works — Bugis to Raffles Place in ~${minutes} min.`);
  } catch (cause) {
    fail(`Routing request failed: ${cause.message}`);
  }
}

const env = readEnv();

console.log('Checking API credentials…');

await checkLta(env.EXPO_PUBLIC_LTA_ACCOUNT_KEY);
await checkOneMap(env.EXPO_PUBLIC_ONEMAP_EMAIL, env.EXPO_PUBLIC_ONEMAP_PASSWORD);

console.log('\nRestart `npm start` after changing .env — values are baked in at bundle time.\n');

# SG Transit

A cross-platform (Android + iOS) app for Singapore public transport: live bus
arrivals, MRT status, A-to-B journey planning on a map, and a "can I still make
it?" verdict that combines your GPS position with the live bus ETA.

Built with Expo SDK 57 and TypeScript. Runs on a real phone through **Expo Go** —
no Xcode or Android Studio required.

## Quick start

```bash
npm install
npm start
```

Then press **`w`** to open the app in your browser, or install **Expo Go** from
the App Store or Play Store and scan the QR code in the terminal to run it on a
real phone.

**It runs with no API keys.** Every screen is populated with realistic sample
data until you add credentials, so you can click through the whole app first.
Anywhere you see a yellow "Sample data" notice, that screen is not live yet.

### Previewing on a laptop

The **browser** (`w`, or <http://localhost:8081>) is the best way to develop:
it reloads instantly, gives you real devtools, and everything works — including
GPS (the browser asks for location permission just as the phone does) and the
map. Chrome devtools' device toolbar will emulate a phone-sized screen, and its
Sensors panel can fake a location anywhere in Singapore, which is handy for
testing "can I make it?" without walking around.

Two caveats, neither blocking:

- It renders as a web app, so you get the web tab bar rather than the real iOS
  or Android one. Check the native feel on a phone before you ship.
- **An iOS Simulator is not possible on Windows** — it only exists on macOS. An
  Android emulator works but needs Android Studio (~10 GB); Expo Go on a real
  phone is quicker and tests the real thing.


### Running on a phone (QR code)

Start the server in your own terminal so the QR code renders:

```bash
npx expo start
```

**The phone and laptop must be on the same Wi-Fi.** The QR code encodes a
private LAN address (here `exp://192.168.10.16:8081`) which only resolves from
inside that network. You can also type that URL into Expo Go by hand instead of
scanning — useful when the camera struggles with the QR code.

If it will not connect:

```bash
npx expo start --tunnel
```

Tunnel mode routes the connection through a public relay, so the phone no longer
needs to be on the same network — it works over mobile data. It is slower to
reload, so use it only when LAN mode fails. Expo will offer to install
`@expo/ngrok` the first time.

Common reasons LAN mode fails:

- **Guest or corporate Wi-Fi with client isolation**, which blocks device-to-device
  traffic by design. Use `--tunnel`, or a phone hotspot.
- **Windows Firewall.** Inbound connections to `node.exe` must be allowed for
  the profile your Wi-Fi is on. Windows marks most networks *Public*, which
  blocks inbound by default, so approve the prompt when it appears.
- **Multiple network adapters.** VPNs and VMware/VirtualBox add extra IPs, and
  Expo can advertise the wrong one. Check the URL printed in the terminal
  matches your real Wi-Fi address (`ipconfig`), and disable unused adapters or
  use `--tunnel` if it does not.

## Going live

Both APIs are free. Registration for each takes a couple of minutes.

1. **LTA DataMall** — live bus arrivals, the bus stop database, train alerts,
   platform crowding.
   Register at <https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html>
   and they email you an *AccountKey*.

2. **OneMap** — journey planning (A to B).
   Register at <https://www.onemap.gov.sg/apidocs/register>. You use the email
   and password you signed up with; the app exchanges them for a token itself.

Then:

```bash
cp .env.example .env
```

and fill in:

```
EXPO_PUBLIC_LTA_ACCOUNT_KEY=your-key-here
EXPO_PUBLIC_ONEMAP_EMAIL=you@example.com
EXPO_PUBLIC_ONEMAP_PASSWORD=your-password
```

Restart `npm start` (env vars are inlined at bundle time). `.env` is git-ignored.

Verify they work before hunting through the app:

```bash
npm run check-keys
```

It tests each credential separately and explains any failure — for LTA a 401 means
the key is wrong while a 404 means the endpoint moved, and for OneMap a failure
usually means the confirmation email has not been clicked yet.

You can add just one of the two — the app switches each half independently, so
an LTA key alone gives you live buses while journey planning stays on samples.

## What is genuinely live, and what is not

This matters, because it is the main honest limitation of any Singapore transit
app:

| Data | Status |
| --- | --- |
| Bus arrival times | **Real-time.** Buses broadcast GPS; ETAs are observed. |
| Bus crowding, wheelchair access, deck type | **Real-time**, per arriving bus. |
| Train disruptions | **Real-time.** |
| Platform crowding | **Live**, recomputed by LTA every 10 minutes. |
| MRT arrival times | **Timetable only.** |

**There is no real-time MRT train data in Singapore.** LTA publishes no train
arrival or train-position feed — as of January 2026 it was still only a
[parliamentary proposal](https://www.mot.gov.sg/news-resources/newsroom/proposal-to-publish-real-time-train-arrival-data-on-lta-datamall/).
Train legs are therefore labelled "scheduled time" in the UI rather than being
presented as live. The "can I make it?" verdict is only offered for bus legs,
where the underlying ETA is real.

## The "can I make it?" feature

The logic lives in `src/lib/makeItInTime.ts` as a pure function, and is the most
thoroughly tested part of the codebase.

```
spare = busETA − walkingTime − 60s boarding buffer
```

- **Green, "You'll make it"** — at least 60s of slack.
- **Amber, "You'll need to hurry"** — you arrive before the bus, but only just.
- **Red, "You'll miss it"** — and it names the next bus you *can* catch.

Walking time comes from OneMap's walk routing when credentials are available,
otherwise from straight-line distance inflated by a 1.35 detour factor at
1.25 m/s. It re-evaluates every second against a ticking clock, and re-routes
when you move more than ~10 m, so the verdict changes as you walk.

Tuning constants are all in `src/config.ts`.

## Layout

```
src/
  app/                  expo-router routes
    (tabs)/             Nearby · Plan · Alerts · Saved
    stop/[code].tsx     one stop, live, per-service verdict
    route/[id].tsx      journey on the map, leg by leg
  api/
    lta.ts              LTA DataMall client
    onemap.ts           OneMap client (token cache, geocoding, routing)
    mock/               fixtures used when keys are absent
  lib/
    makeItInTime.ts     the verdict engine (pure, unit-tested)
    geo.ts              haversine, encoded-polyline decoding
    time.ts             Singapore-timezone handling
    busStopDb.ts        cached bus stop database
  map/
    LeafletMap.tsx      native map (WebView)
    LeafletMap.web.tsx  browser map (iframe) — react-native-webview has no web build
    types.ts            props shared by both implementations
    leafletHtml.ts      Leaflet + OneMap tiles
```

## Notes for whoever works on this next

- **API endpoint paths were verified live on 2026-09-10**, after LTA's Aug 2026
  DataMall revamp. Most tutorials online are out of date: the old
  `/ltaodataservice/BusArrivalv2` is **retired and 404s**. The live arrival
  endpoint is versioned (`/ltaodataservice/v3/BusArrival`) while the static
  datasets are *not* (`/ltaodataservice/BusStops`).
- Handy diagnostic: on DataMall, a **404** means the path is wrong, a **401**
  means the key is wrong. That difference is how the current paths were found.
- **OneMap tokens expire after 3 days.** `src/api/onemap.ts` caches and renews
  them; this is the most likely cause of a "worked yesterday" bug.
- The map is Leaflet in a WebView over OneMap raster tiles, deliberately chosen
  so that Android needs no Google Maps API key or billing account. OneMap's
  attribution is required by their terms — don't remove it from
  `src/map/leafletHtml.ts`.
- API keys are bundled into the app via `EXPO_PUBLIC_*`, which means they can be
  extracted from a distributed build. Fine for personal or workshop use. Before
  publishing publicly, put a thin proxy in front: only the two base URLs in
  `src/api/lta.ts` and `src/api/onemap.ts` need to change.

## Commands

```bash
npm start          # dev server; scan the QR with Expo Go
npm run web        # run in a browser
npm run check-keys # verify your .env credentials actually work
npm test           # unit tests (47 tests)
npx tsc --noEmit   # typecheck
```

## Not built yet

- **Background "leave now!" notifications.** Needs background location, which
  Expo Go cannot grant — it requires a custom dev client and store-review
  justification.
- **Arrive-by journey search.** OneMap's routing takes a *departure* time only;
  arrive-by would mean searching backwards over candidate departure times.
- **Store submission.** Needs Expo EAS Build, plus a Google Play account
  (US$25 once) and an Apple Developer account (US$99/year).

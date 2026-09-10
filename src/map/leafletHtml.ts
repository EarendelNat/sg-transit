/**
 * The map is a Leaflet instance inside a WebView, drawing OneMap's raster
 * tiles. This avoids needing a Google Maps API key (and therefore a billing
 * account) on Android, and OneMap is the most detailed basemap of Singapore
 * available.
 *
 * The page is kept as a string rather than a bundled asset file so it does not
 * depend on Metro asset resolution, and so the whole map contract lives in one
 * readable place.
 *
 * Communication with React Native:
 *   RN  -> page : `window.render(payloadJson)`, invoked via injectJavaScript
 *   page -> RN  : window.ReactNativeWebView.postMessage(JSON.stringify(...))
 */

/** Attribution required by OneMap's terms of use. Do not remove. */
const ONEMAP_ATTRIBUTION =
  '<a href="https://www.onemap.gov.sg/" target="_blank">OneMap</a> &copy; contributors | ' +
  '<a href="https://www.sla.gov.sg/" target="_blank">Singapore Land Authority</a>';

/** Roughly the extent of Singapore, so the user cannot pan off to the Atlantic. */
const SG_BOUNDS = '[[1.144, 103.535], [1.494, 104.502]]';

export const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #e9e9e9; }
  .leaflet-container { background: #e9e9e9; font-family: -apple-system, system-ui, sans-serif; }
  .leaflet-control-attribution { font-size: 9px; }

  /* Pulsing dot for the user's own position. */
  .me {
    width: 16px; height: 16px; border-radius: 50%;
    background: #1a73e8; border: 3px solid #fff;
    box-shadow: 0 0 0 rgba(26,115,232,0.6); animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(26,115,232,0.5); }
    70%  { box-shadow: 0 0 0 14px rgba(26,115,232,0); }
    100% { box-shadow: 0 0 0 0 rgba(26,115,232,0); }
  }

  /* Numbered stop / interchange markers. */
  .pin {
    display: flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%;
    background: #fff; border: 3px solid #444;
    font-size: 11px; font-weight: 700; color: #222;
  }
  .pin.bus  { border-color: #1a7f37; }
  .pin.rail { border-color: #8250df; }
  .pin.stop { border-color: #d1242f; }

  /* A live bus position. */
  .bus-dot {
    width: 14px; height: 14px; border-radius: 4px;
    background: #1a7f37; border: 2px solid #fff;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', {
    zoomControl: false,
    attributionControl: true,
    maxBounds: ${SG_BOUNDS},
    maxBoundsViscosity: 0.8,
  }).setView([1.3521, 103.8198], 12);

  L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
    detectRetina: true,
    maxZoom: 19,
    minZoom: 11,
    attribution: '${ONEMAP_ATTRIBUTION}',
  }).addTo(map);

  // Everything we draw goes in one layer group so a re-render is a clean swap.
  var overlay = L.layerGroup().addTo(map);
  var meMarker = null;

  // On native the host is a WebView; on web the same page runs in an iframe, so
  // fall back to posting to the parent frame.
  function post(payload) {
    var body = JSON.stringify(payload);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(body);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(body, '*');
    }
  }

  function divIcon(className, label, size) {
    return L.divIcon({
      className: '',
      html: '<div class="' + className + '">' + (label || '') + '</div>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  /**
   * Draws a complete scene. Called from React Native on every state change,
   * because redrawing a handful of shapes is cheaper and far less error-prone
   * than diffing them.
   *
   * payload = {
   *   me:     {lat, lng} | null,
   *   lines:  [{ points: [{lat,lng}], color, dashed }],
   *   markers:[{ lat, lng, label, kind, title }],
   *   buses:  [{ lat, lng, title }],
   *   fit:    boolean
   * }
   */
  window.render = function (json) {
    var data = typeof json === 'string' ? JSON.parse(json) : json;
    overlay.clearLayers();

    var fitPoints = [];

    (data.lines || []).forEach(function (line) {
      var latlngs = (line.points || []).map(function (p) { return [p.lat, p.lng]; });
      if (latlngs.length < 2) return;

      // A wide translucent casing under the line makes it legible over busy tiles.
      L.polyline(latlngs, { color: '#fff', weight: 9, opacity: 0.9 }).addTo(overlay);
      L.polyline(latlngs, {
        color: line.color || '#1a73e8',
        weight: 5,
        opacity: 1,
        dashArray: line.dashed ? '1,9' : null,
        lineCap: 'round',
      }).addTo(overlay);

      fitPoints = fitPoints.concat(latlngs);
    });

    (data.markers || []).forEach(function (m) {
      var marker = L.marker([m.lat, m.lng], {
        icon: divIcon('pin ' + (m.kind || 'stop'), m.label, 22),
      }).addTo(overlay);

      if (m.title) marker.bindTooltip(m.title, { direction: 'top' });
      marker.on('click', function () { post({ type: 'markerPress', id: m.id }); });

      fitPoints.push([m.lat, m.lng]);
    });

    (data.buses || []).forEach(function (b) {
      var marker = L.marker([b.lat, b.lng], { icon: divIcon('bus-dot', '', 14) }).addTo(overlay);
      if (b.title) marker.bindTooltip(b.title, { direction: 'top' });
    });

    if (data.me) {
      var here = [data.me.lat, data.me.lng];
      if (meMarker) {
        meMarker.setLatLng(here);
      } else {
        meMarker = L.marker(here, { icon: divIcon('me', '', 16), zIndexOffset: 1000 }).addTo(map);
      }
      fitPoints.push(here);
    }

    if (data.fit && fitPoints.length > 0) {
      map.fitBounds(L.latLngBounds(fitPoints), { padding: [36, 36], maxZoom: 17 });
    } else if (data.center) {
      map.setView([data.center.lat, data.center.lng], data.zoom || 16);
    }
  };

  post({ type: 'ready' });
</script>
</body>
</html>`;

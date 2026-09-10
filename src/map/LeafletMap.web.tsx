/**
 * Browser map: the same Leaflet/OneMap page, in an iframe instead of a WebView.
 *
 * `react-native-webview` ships no web implementation (it has `.android`, `.ios`,
 * `.macos` and `.windows` variants only), so without this file the map is the
 * one thing that would not render when previewing the app in a browser. An
 * iframe with `srcDoc` is the direct equivalent: same-origin, so the parent can
 * call `window.render` on it exactly as `injectJavaScript` does on native.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LEAFLET_HTML } from '@/map/leafletHtml';
import type { LeafletMapProps } from '@/map/types';

export type { LeafletMapProps, MapBus, MapLine, MapMarker } from '@/map/types';

/** The map page defines this on its own `window` once Leaflet has loaded. */
type MapFrameWindow = Window & { render?: (sceneJson: string) => void };

export function LeafletMap({
  me = null,
  lines = [],
  markers = [],
  buses = [],
  fit = true,
  center,
  zoom,
  onMarkerPress,
  style,
}: LeafletMapProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  const scene = JSON.stringify({ me, lines, markers, buses, fit, center, zoom });

  // `load` fires after the Leaflet script tag has run, so `window.render` exists.
  const handleLoad = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;

    const frameWindow = frameRef.current?.contentWindow as MapFrameWindow | null | undefined;
    frameWindow?.render?.(scene);
  }, [ready, scene]);

  // Marker taps arrive as postMessage from the frame rather than through a
  // WebView bridge.
  useEffect(() => {
    if (!onMarkerPress) return;

    function onMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;

      try {
        const message = JSON.parse(String(event.data)) as { type: string; id?: string };
        if (message.type === 'markerPress' && message.id) onMarkerPress?.(message.id);
      } catch {
        // Other scripts on the page also post messages; ignore anything else.
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onMarkerPress]);

  return (
    <View style={[styles.container, style]}>
      <iframe
        ref={frameRef}
        onLoad={handleLoad}
        srcDoc={LEAFLET_HTML}
        title="Map"
        style={frameStyle}
      />
    </View>
  );
}

/** Plain CSS, since this element is a real DOM node rather than a View. */
const frameStyle = {
  border: 'none',
  width: '100%',
  height: '100%',
  display: 'block',
} as const;

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#e9e9e9',
  },
});

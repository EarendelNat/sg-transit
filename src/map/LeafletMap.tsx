/**
 * Native map: the Leaflet/OneMap page inside a WebView.
 *
 * The scene is pushed in as a single JSON payload whenever it changes, and only
 * after the page reports that Leaflet has finished loading — otherwise the first
 * render races the CDN script tag and is silently lost.
 *
 * The browser equivalent lives in `LeafletMap.web.tsx`; Metro picks the right
 * file per platform. Shared props are in `./types`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { LEAFLET_HTML } from '@/map/leafletHtml';
import type { LeafletMapProps } from '@/map/types';

export type { LeafletMapProps, MapBus, MapLine, MapMarker } from '@/map/types';

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
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  const scene = JSON.stringify({ me, lines, markers, buses, fit, center, zoom });

  useEffect(() => {
    if (!ready) return;
    // The trailing `true;` suppresses a warning about a non-serialisable result.
    webRef.current?.injectJavaScript(`window.render(${JSON.stringify(scene)}); true;`);
  }, [ready, scene]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message = JSON.parse(event.nativeEvent.data) as { type: string; id?: string };

        if (message.type === 'ready') setReady(true);
        if (message.type === 'markerPress' && message.id) onMarkerPress?.(message.id);
      } catch {
        // A malformed message from the page is not worth crashing over.
      }
    },
    [onMarkerPress],
  );

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webRef}
        source={{ html: LEAFLET_HTML, baseUrl: 'https://www.onemap.gov.sg' }}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        // The map handles its own panning; bouncing the whole page fights it.
        bounces={false}
        scrollEnabled={false}
        // Android renders tiles noticeably faster on the hardware layer.
        androidLayerType="hardware"
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#e9e9e9',
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

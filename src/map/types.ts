/**
 * Map props shared by the native and web implementations of `LeafletMap`.
 *
 * These live in their own module so the two platform files cannot drift apart:
 * `LeafletMap.tsx` (WebView) and `LeafletMap.web.tsx` (iframe) both import from
 * here, and both re-export these names so callers only ever import from
 * `@/map/LeafletMap`.
 */

import type { StyleProp, ViewStyle } from 'react-native';

import type { LatLng } from '@/lib/geo';

export type MapLine = {
  points: LatLng[];
  /** Dashed lines read as "on foot". */
  dashed?: boolean;
  color?: string;
};

export type MapMarker = {
  id?: string;
  lat: number;
  lng: number;
  /** Short label drawn inside the pin, e.g. a leg number. */
  label?: string;
  kind?: 'bus' | 'rail' | 'stop';
  title?: string;
};

export type MapBus = { lat: number; lng: number; title?: string };

export type LeafletMapProps = {
  me?: LatLng | null;
  lines?: MapLine[];
  markers?: MapMarker[];
  buses?: MapBus[];
  /** Zoom to fit everything drawn. Otherwise `center`/`zoom` apply. */
  fit?: boolean;
  center?: LatLng;
  zoom?: number;
  onMarkerPress?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
};

/** The payload handed to `window.render` inside the map page. */
export type MapScene = Pick<
  LeafletMapProps,
  'me' | 'lines' | 'markers' | 'buses' | 'fit' | 'center' | 'zoom'
>;

/**
 * A "where from / where to" field with OneMap address autocomplete.
 *
 * Geocoding needs no API token, so this works before any credentials are set up.
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { searchPlaces } from '@/api/onemap';
import type { GeocodeResult } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PlaceValue = GeocodeResult | { name: string; lat: number; lng: number };

export function PlaceInput({
  label,
  placeholder,
  value,
  onChange,
  onUseMyLocation,
}: {
  label: string;
  placeholder: string;
  value: PlaceValue | null;
  onChange: (place: PlaceValue | null) => void;
  /** Offered only for the "from" field. */
  onUseMyLocation?: () => void;
}) {
  const theme = useTheme();
  const [text, setText] = useState(value?.name ?? '');
  const [debounced, setDebounced] = useState('');
  const [focused, setFocused] = useState(false);

  // Reflect changes made from outside, e.g. "use my location" or a swap.
  useEffect(() => {
    setText(value?.name ?? '');
  }, [value]);

  // Typing a query per keystroke would hammer the geocoder; wait for a pause.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), 250);
    return () => clearTimeout(timer);
  }, [text]);

  const isChosen = value !== null && value.name === text;

  const suggestions = useQuery({
    queryKey: ['places', debounced],
    queryFn: () => searchPlaces(debounced),
    // Skip searching when the field already holds a chosen place.
    enabled: focused && !isChosen && debounced.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const results = suggestions.data ?? [];

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {label}
        </ThemedText>

        {onUseMyLocation && (
          <Pressable onPress={onUseMyLocation} accessibilityRole="button">
            <ThemedText type="linkPrimary">Use my location</ThemedText>
          </Pressable>
        )}
      </View>

      <TextInput
        value={text}
        onChangeText={(next) => {
          setText(next);
          // Typing invalidates the previously chosen place.
          if (value !== null) onChange(null);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        autoCorrect={false}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />

      {focused && !isChosen && results.length > 0 && (
        <View style={[styles.suggestions, { backgroundColor: theme.backgroundElement }]}>
          {results.map((place, index) => (
            <Pressable
              key={`${place.name}-${index}`}
              onPress={() => {
                onChange(place);
                setText(place.name);
                setFocused(false);
              }}
              style={({ pressed }) => [
                styles.suggestion,
                pressed && { backgroundColor: theme.backgroundSelected },
                index > 0 && styles.suggestionDivider,
              ]}
              accessibilityRole="button">
              <ThemedText type="small" numberOfLines={1}>
                {place.name}
              </ThemedText>
              {'address' in place && place.address.length > 0 && (
                <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                  {place.address}
                </ThemedText>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {focused && !isChosen && suggestions.isError && (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Address search is unavailable right now.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  suggestions: {
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 1,
  },
  suggestionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.35)',
  },
});

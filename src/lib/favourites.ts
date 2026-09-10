/**
 * Pinned bus stops, persisted on the device.
 *
 * Stored as an ordered list of stop codes rather than whole stop records, so the
 * names and coordinates always come from the (refreshable) bus stop database
 * instead of going stale here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sg-transit/favourites/v1';

export async function getFavourites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

async function save(codes: string[]): Promise<string[]> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  } catch {
    // Persisting is best-effort; the in-memory result is still correct.
  }
  return codes;
}

/** Adds a stop if absent, removes it if present. Returns the new list. */
export async function toggleFavourite(code: string): Promise<string[]> {
  const current = await getFavourites();

  return save(
    current.includes(code) ? current.filter((existing) => existing !== code) : [...current, code],
  );
}

export async function isFavourite(code: string): Promise<boolean> {
  return (await getFavourites()).includes(code);
}

// User presets and favorites live in IndexedDB on the device (ADR-001, ADR-002). Nothing leaves it.

import { openDB, type IDBPDatabase } from 'idb';
import type { EditState } from '../editor/effects';

export type UserPreset = { id: string; name: string; state: EditState; created: number };

let db: Promise<IDBPDatabase> | null = null;

function open() {
  db ??= openDB('y2k', 1, {
    upgrade(d) {
      d.createObjectStore('presets', { keyPath: 'id' });
      d.createObjectStore('settings');
    },
  });
  return db;
}

export async function loadUserPresets(): Promise<UserPreset[]> {
  const all = (await (await open()).getAll('presets')) as UserPreset[];
  return all.sort((a, b) => a.created - b.created);
}

export async function saveUserPreset(p: UserPreset) {
  await (await open()).put('presets', p);
}

export async function deleteUserPreset(id: string) {
  await (await open()).delete('presets', id);
}

export async function loadFavorites(): Promise<string[]> {
  return ((await (await open()).get('settings', 'favorites')) as string[] | undefined) ?? [];
}

export async function saveFavorites(ids: string[]) {
  await (await open()).put('settings', ids, 'favorites');
}

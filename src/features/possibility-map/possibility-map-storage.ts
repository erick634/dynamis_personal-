import type { PossibilityMap } from '@/types/possibility-map';

const STORAGE_KEY_PREFIX = 'dynamis.possibilityMap.';

export type StoredPossibilityMap = {
  userId: string;
  profileFingerprint: string;
  map: PossibilityMap;
  source: 'llm' | 'derived';
  savedAt: string;
};

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function isValidStoredMap(value: unknown, userId: string): value is StoredPossibilityMap {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.userId !== userId) {
    return false;
  }
  if (typeof record.profileFingerprint !== 'string' || record.profileFingerprint.length === 0) {
    return false;
  }
  if (typeof record.savedAt !== 'string') {
    return false;
  }
  if (record.source !== 'llm' && record.source !== 'derived') {
    return false;
  }
  const map = record.map;
  if (map == null || typeof map !== 'object') {
    return false;
  }
  const mapRecord = map as Record<string, unknown>;
  return Array.isArray(mapRecord.dimensions) && mapRecord.dimensions.length === 4;
}

export function getStoredPossibilityMap(userId: string): StoredPossibilityMap | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStoredMap(parsed, userId)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredPossibilityMap(stored: StoredPossibilityMap): void {
  localStorage.setItem(storageKey(stored.userId), JSON.stringify(stored));
}

export function clearStoredPossibilityMap(userId: string): void {
  localStorage.removeItem(storageKey(userId));
}

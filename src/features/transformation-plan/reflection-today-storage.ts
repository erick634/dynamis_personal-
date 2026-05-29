import { getTodayKey } from '@/features/transformation-plan/plan-storage';
import type { DynamisGoal } from '@/types/energeia';

const STORAGE_KEY_PREFIX = 'dynamis.reflection.didToday.';

export const REFLECTION_TODAY_GOAL_ID_PREFIX = 'reflection-today-';

type ReflectionTodayRecord = {
  date: string;
  items: string[];
  savedAt: string;
};

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function saveReflectionDidToday(userId: string, items: string[]): void {
  const normalized = items.map((item) => item.trim()).filter((item) => item.length > 0);

  const record: ReflectionTodayRecord = {
    date: getTodayKey(),
    items: normalized,
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem(storageKey(userId), JSON.stringify(record));
}

export function getReflectionDidToday(userId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return [];
    }

    const record = parsed as ReflectionTodayRecord;
    if (record.date !== getTodayKey()) {
      return [];
    }

    if (!Array.isArray(record.items)) {
      return [];
    }

    return record.items.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
  } catch {
    return [];
  }
}

export function isReflectionTodayGoalId(goalId: string): boolean {
  return goalId.startsWith(REFLECTION_TODAY_GOAL_ID_PREFIX);
}

export function reflectionItemsToGoals(items: string[], date = getTodayKey()): DynamisGoal[] {
  const realizedAt = new Date().toISOString();

  return items.map((title, index) => ({
    id: `${REFLECTION_TODAY_GOAL_ID_PREFIX}${date}-${String(index)}`,
    title,
    realized: true,
    priority: 'normal',
    tag: 'reflect',
    dueLabelKey: 'todayAt',
    realizedAt,
  }));
}

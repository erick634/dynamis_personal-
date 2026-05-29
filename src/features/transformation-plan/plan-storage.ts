import type { DynamisGoal } from '@/types/energeia';

export type StreakData = {
  currentStreak: number;
  lastRealizedDate: string | null;
  realizedDates: string[];
};

export type PersistedPlan = {
  userId: string;
  goals: DynamisGoal[];
  realizedIds: string[];
  streakData: StreakData;
  generatedAt: string;
};

const STORAGE_KEY_PREFIX = 'dynamis.plan.';

function planStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

/** Local calendar date as `YYYY-MM-DD` (user timezone). */
export function getTodayKey(): string {
  return formatDateKey(new Date());
}

export function getYesterdayKey(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateKey(yesterday);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(year)}-${month}-${day}`;
}

export function createEmptyStreakData(): StreakData {
  return {
    currentStreak: 0,
    lastRealizedDate: null,
    realizedDates: [],
  };
}

/**
 * Streak shown in the UI (Duolingo-style).
 * - Today already has a mark → currentStreak
 * - Last mark was yesterday → still alive (full day left to mark)
 * - Older than yesterday → broken (0)
 */
export function calculateDisplayStreak(streakData: StreakData): number {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  if (streakData.realizedDates.includes(today)) {
    return streakData.currentStreak;
  }

  if (streakData.lastRealizedDate === yesterday) {
    return streakData.currentStreak;
  }

  return 0;
}

/** Persisted streak resets to 0 when the display streak has broken (next save). */
export function normalizeStreakIfBroken(streakData: StreakData): StreakData {
  if (calculateDisplayStreak(streakData) === 0 && streakData.currentStreak > 0) {
    return { ...streakData, currentStreak: 0 };
  }
  return streakData;
}

/**
 * Call when a goal transitions unrealized → realized.
 * If today already counted, streak is unchanged.
 */
export function applyStreakOnMark(streakData: StreakData): StreakData {
  const today = getTodayKey();

  if (streakData.realizedDates.includes(today)) {
    return streakData;
  }

  const yesterday = getYesterdayKey();
  let currentStreak = 1;

  if (streakData.lastRealizedDate === yesterday) {
    currentStreak = streakData.currentStreak + 1;
  } else if (streakData.lastRealizedDate === today) {
    currentStreak = streakData.currentStreak;
  } else if (streakData.lastRealizedDate !== null) {
    currentStreak = 1;
  }

  return {
    currentStreak,
    lastRealizedDate: today,
    realizedDates: [...streakData.realizedDates, today],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidStreakData(value: unknown): value is StreakData {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.currentStreak === 'number' &&
    Number.isFinite(value.currentStreak) &&
    (value.lastRealizedDate === null || typeof value.lastRealizedDate === 'string') &&
    Array.isArray(value.realizedDates) &&
    value.realizedDates.every((item) => typeof item === 'string')
  );
}

function isValidDynamisGoal(value: unknown): value is DynamisGoal {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.realized === 'boolean' &&
    (value.priority === 'high' || value.priority === 'normal') &&
    (value.tag === 'research' || value.tag === 'build' || value.tag === 'reflect') &&
    (value.realizedAt === null || typeof value.realizedAt === 'string')
  );
}

function isValidPersistedPlan(value: unknown, userId: string): value is PersistedPlan {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.userId === userId &&
    Array.isArray(value.goals) &&
    value.goals.every(isValidDynamisGoal) &&
    Array.isArray(value.realizedIds) &&
    value.realizedIds.every((id) => typeof id === 'string') &&
    isValidStreakData(value.streakData) &&
    typeof value.generatedAt === 'string'
  );
}

export function getPlanForUser(userId: string): PersistedPlan | null {
  try {
    const raw = localStorage.getItem(planStorageKey(userId));
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersistedPlan(parsed, userId)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePlanForUser(userId: string, plan: PersistedPlan): void {
  const payload: PersistedPlan = {
    ...plan,
    userId,
    streakData: normalizeStreakIfBroken(plan.streakData),
    realizedIds: [...plan.realizedIds],
  };
  localStorage.setItem(planStorageKey(userId), JSON.stringify(payload));
}

export function clearPlanForUser(userId: string): void {
  localStorage.removeItem(planStorageKey(userId));
}

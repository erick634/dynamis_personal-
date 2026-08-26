import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import { parseGoalPriority } from '@/features/intent-profile/goal-priority';
import type {
  GoalHorizonMonths,
  LifeAreaGoalTask,
  LifeAreaUserGoal,
  TaskSchedule,
} from '@/features/intent-profile/life-area-goals-types';
import { GOAL_HORIZON_MONTHS } from '@/features/intent-profile/life-area-goals-types';

function isHorizonMonths(value: unknown): value is GoalHorizonMonths {
  return typeof value === 'number' && (GOAL_HORIZON_MONTHS as readonly number[]).includes(value);
}

function parseDurationMinutes(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > 24 * 60) return null;
  return value;
}

function parseDateKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is string => typeof item === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item),
  );
}

export function parsePersistedSchedule(raw: unknown): TaskSchedule | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const cadence = record.cadence;
  const time = record.time === null || typeof record.time === 'string' ? record.time : null;

  if (cadence === 'daily') {
    return {
      cadence: 'daily',
      time,
      includeWeekends: record.includeWeekends !== false,
    };
  }
  if (cadence === 'weekly') {
    const weekday = Number(record.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
    return { cadence: 'weekly', weekday: weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6, time };
  }
  if (cadence === 'monthly') {
    const dayOfMonth = Number(
      record.dayOfMonth ?? (record as { day_of_month?: unknown }).day_of_month,
    );
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return null;
    return { cadence: 'monthly', dayOfMonth, time };
  }
  return null;
}

function parseTask(raw: unknown): LifeAreaGoalTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.title !== 'string') return null;
  const schedule = parsePersistedSchedule(record.schedule);
  if (!schedule) return null;
  return {
    id: record.id,
    title: record.title,
    schedule,
    durationMinutes: parseDurationMinutes(record.durationMinutes),
    priority: parseGoalPriority(record.priority),
    completedDates: parseDateKeys(record.completedDates),
    skippedDates: parseDateKeys(record.skippedDates),
  };
}

export function parsePersistedGoal(raw: unknown, areaId: LifeAreaId): LifeAreaUserGoal | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.title !== 'string') return null;
  const tasks = Array.isArray(record.tasks)
    ? record.tasks.flatMap((item) => {
        const parsed = parseTask(item);
        return parsed ? [parsed] : [];
      })
    : [];
  return {
    id: record.id,
    areaId,
    title: record.title,
    horizonMonths: isHorizonMonths(record.horizonMonths) ? record.horizonMonths : 3,
    priority: parseGoalPriority(record.priority),
    tasks,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    completedAt:
      typeof record.completedAt === 'string' && record.completedAt.trim()
        ? record.completedAt
        : null,
  };
}

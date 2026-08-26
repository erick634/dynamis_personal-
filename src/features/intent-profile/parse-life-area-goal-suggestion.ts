import { LIFE_AREA_IDS, type LifeAreaId } from '@/features/intent-profile/life-area-scores';
import type {
  GoalHorizonMonths,
  TaskSchedule,
} from '@/features/intent-profile/life-area-goals-types';
import { GOAL_HORIZON_MONTHS } from '@/features/intent-profile/life-area-goals-types';
import type { LifeAreaGoalSuggestion } from '@/features/intent-profile/use-life-area-goals';

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isLifeAreaId(value: string): value is LifeAreaId {
  return (LIFE_AREA_IDS as readonly string[]).includes(value);
}

function parseHorizonMonths(raw: unknown): GoalHorizonMonths {
  const value = Number(raw);
  if ((GOAL_HORIZON_MONTHS as readonly number[]).includes(value)) {
    return value as GoalHorizonMonths;
  }
  return 3;
}

function parseDurationMinutes(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > 24 * 60) return null;
  return value;
}

function parseSchedule(raw: unknown): TaskSchedule | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const cadence = record.cadence;
  const time = record.time === null || typeof record.time === 'string' ? record.time : null;

  if (cadence === 'daily') {
    const weekends =
      typeof record.include_weekends === 'boolean'
        ? record.include_weekends
        : typeof record.includeWeekends === 'boolean'
          ? record.includeWeekends
          : false;
    return { cadence: 'daily', time, includeWeekends: weekends };
  }
  if (cadence === 'weekly') {
    const weekday = Number(record.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
    return { cadence: 'weekly', weekday: weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6, time };
  }
  if (cadence === 'monthly') {
    const dayOfMonth = Number(record.day_of_month ?? record.dayOfMonth);
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return null;
    return { cadence: 'monthly', dayOfMonth, time };
  }
  return null;
}

export function parseLifeAreaGoalSuggestion(raw: unknown): LifeAreaGoalSuggestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const areaRaw = asTrimmed(record.area_id) || asTrimmed(record.areaId);
  if (!isLifeAreaId(areaRaw)) return null;
  const title = asTrimmed(record.title);
  if (!title) return null;
  if (!Array.isArray(record.tasks) || record.tasks.length === 0) return null;

  const tasks = record.tasks.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const taskTitle = asTrimmed(row.title);
    if (!taskTitle) return [];
    const schedule = parseSchedule(row.schedule ?? row);
    if (!schedule) return [];
    return [
      {
        title: taskTitle,
        schedule,
        durationMinutes: parseDurationMinutes(row.duration_minutes ?? row.durationMinutes),
      },
    ];
  });

  if (tasks.length === 0) return null;
  return {
    areaId: areaRaw,
    title,
    horizonMonths: parseHorizonMonths(record.horizon_months ?? record.horizonMonths),
    tasks,
  };
}

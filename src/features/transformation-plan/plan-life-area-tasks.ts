import { toDateKey, isTaskActiveToday } from '@/features/intent-profile/format-task-schedule';
import {
  addDays,
  addMonths,
  startOfMonth,
  startOfWeekSunday,
} from '@/features/intent-profile/life-area-goal-calendar';
import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import type {
  GoalPriority,
  LifeAreaGoalTask,
  LifeAreaUserGoal,
  TaskSchedule,
} from '@/features/intent-profile/life-area-goals-types';

export type PlanPeriodFilter = 'all' | 'today' | 'week' | 'month';

export type PlanLifeAreaTaskRow = {
  /** Stable row id: areaId:goalId:taskId */
  id: string;
  areaId: LifeAreaId;
  goalId: string;
  taskId: string;
  taskTitle: string;
  goalTitle: string;
  priority: GoalPriority;
  schedule: TaskSchedule;
  time: string | null;
  /** Date this row uses for done/skip toggle (YYYY-MM-DD). */
  focusDateKey: string;
  completed: boolean;
  skipped: boolean;
  /** Completed / expected sessions for this task inside the filtered period. */
  periodDone: number;
  periodTotal: number;
  task: LifeAreaGoalTask;
};

const PRIORITY_RANK: Record<GoalPriority, number> = {
  essential: 0,
  moreImportant: 1,
  lessImportant: 2,
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function rangeForFilter(filter: PlanPeriodFilter, now: Date): { start: Date; end: Date } {
  const today = startOfLocalDay(now);
  if (filter === 'today') {
    return { start: today, end: today };
  }
  if (filter === 'week') {
    const start = startOfWeekSunday(today);
    return { start, end: addDays(start, 6) };
  }
  if (filter === 'month') {
    const start = startOfMonth(today);
    return { start, end: addDays(addMonths(start, 1), -1) };
  }
  // "all" — today through next 31 days
  return { start: today, end: addDays(today, 31) };
}

function eachActiveDateInRange(schedule: TaskSchedule, start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let cursor = startOfLocalDay(start);
  const last = startOfLocalDay(end);
  while (cursor.getTime() <= last.getTime()) {
    if (isTaskActiveToday(schedule, cursor)) {
      dates.push(new Date(cursor));
    }
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function periodSessionStats(
  task: LifeAreaGoalTask,
  activeDates: Date[],
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const date of activeDates) {
    const key = toDateKey(date);
    if (task.skippedDates.includes(key)) continue;
    total += 1;
    if (task.completedDates.includes(key)) done += 1;
  }
  return { done, total };
}

/**
 * Prefer today (when due), else next incomplete day in range,
 * else most recent completed day, else first active day.
 */
function pickFocusDate(task: LifeAreaGoalTask, activeDates: Date[], now: Date): Date | null {
  if (activeDates.length === 0) return null;

  const today = startOfLocalDay(now);
  const todayKey = toDateKey(today);
  const todayMatch = activeDates.find((date) => toDateKey(date) === todayKey);
  if (todayMatch) return todayMatch;

  const incomplete = activeDates.find((date) => {
    const key = toDateKey(date);
    return !task.completedDates.includes(key) && !task.skippedDates.includes(key);
  });
  if (incomplete) return incomplete;

  for (let index = activeDates.length - 1; index >= 0; index -= 1) {
    const date = activeDates[index];
    if (!date) continue;
    if (task.completedDates.includes(toDateKey(date))) return date;
  }

  return activeDates[0] ?? null;
}

function comparePlanRows(a: PlanLifeAreaTaskRow, b: PlanLifeAreaTaskRow): number {
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;
  if (a.time && b.time) return a.time.localeCompare(b.time);
  if (a.time) return -1;
  if (b.time) return 1;
  return a.taskTitle.localeCompare(b.taskTitle);
}

/**
 * Flatten life-area tasks into a Plan list for the given period.
 * One row per task. Progress counts every due session in the period
 * (so today's completions roll into Week / Month).
 */
export function buildPlanLifeAreaTaskRows(
  goalsByArea: Partial<Record<LifeAreaId, LifeAreaUserGoal[]>>,
  filter: PlanPeriodFilter,
  now: Date = new Date(),
): PlanLifeAreaTaskRow[] {
  const range = rangeForFilter(filter, now);
  const rows: PlanLifeAreaTaskRow[] = [];

  for (const goals of Object.values(goalsByArea)) {
    for (const goal of goals) {
      if (goal.completedAt) continue;
      for (const task of goal.tasks) {
        const activeDates = eachActiveDateInRange(task.schedule, range.start, range.end);
        if (activeDates.length === 0) continue;

        const focusDate = pickFocusDate(task, activeDates, now);
        if (!focusDate) continue;

        const focusDateKey = toDateKey(focusDate);
        const sessions = periodSessionStats(task, activeDates);

        rows.push({
          id: `${goal.areaId}:${goal.id}:${task.id}`,
          areaId: goal.areaId,
          goalId: goal.id,
          taskId: task.id,
          taskTitle: task.title,
          goalTitle: goal.title,
          priority: task.priority,
          schedule: task.schedule,
          time: task.schedule.time,
          focusDateKey,
          completed: task.completedDates.includes(focusDateKey),
          skipped: task.skippedDates.includes(focusDateKey),
          periodDone: sessions.done,
          periodTotal: sessions.total,
          task,
        });
      }
    }
  }

  return rows.sort(comparePlanRows);
}

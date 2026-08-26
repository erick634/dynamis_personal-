import type { TFunction } from 'i18next';

import type {
  GoalHorizonMonths,
  TaskSchedule,
  Weekday,
} from '@/features/intent-profile/life-area-goals-types';

export function formatTaskSchedule(schedule: TaskSchedule, t: TFunction): string {
  const timeLabel = schedule.time
    ? t('you.lifeArea.goals.schedule.atTime', { time: schedule.time })
    : t('you.lifeArea.goals.schedule.noTime');

  if (schedule.cadence === 'daily') {
    const weekendLabel = schedule.includeWeekends
      ? t('you.lifeArea.goals.schedule.withWeekends')
      : t('you.lifeArea.goals.schedule.weekdaysOnly');
    return `${t('you.lifeArea.goals.cadence.daily')} · ${weekendLabel} · ${timeLabel}`;
  }
  if (schedule.cadence === 'weekly') {
    return `${t('you.lifeArea.goals.cadence.weekly')} · ${t(`you.lifeArea.goals.weekday.${String(schedule.weekday)}`)} · ${timeLabel}`;
  }
  return `${t('you.lifeArea.goals.cadence.monthly')} · ${t(
    'you.lifeArea.goals.schedule.dayOfMonth',
    {
      day: schedule.dayOfMonth,
    },
  )} · ${timeLabel}`;
}

export function formatDurationMinutes(minutes: number | null, t: TFunction): string | null {
  if (minutes === null || minutes <= 0) return null;
  if (minutes < 60) {
    return t('you.lifeArea.goals.schedule.durationMinutes', { count: minutes });
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) {
    return t('you.lifeArea.goals.schedule.durationHours', { count: hours });
  }
  return t('you.lifeArea.goals.schedule.durationHoursMinutes', {
    hours,
    minutes: rest,
  });
}

export function formatGoalHorizon(months: GoalHorizonMonths, t: TFunction): string {
  return t(`you.lifeArea.goals.horizon.${String(months)}`);
}

/** Local calendar date as YYYY-MM-DD. */
export function toDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(year)}-${month}-${day}`;
}

export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isTaskActiveToday(schedule: TaskSchedule, date: Date = new Date()): boolean {
  if (schedule.cadence === 'daily') {
    if (!schedule.includeWeekends && isWeekend(date)) return false;
    return true;
  }
  if (schedule.cadence === 'weekly') {
    return date.getDay() === schedule.weekday;
  }
  return date.getDate() === schedule.dayOfMonth;
}

export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

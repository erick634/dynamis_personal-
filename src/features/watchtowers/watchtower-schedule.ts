const DAY_MS = 24 * 60 * 60 * 1000;

function cadenceDays(frequency: string): number {
  const normalized = frequency.trim().toLowerCase();
  if (normalized.includes('daily') || normalized.includes('diár')) {
    return 1;
  }
  if (normalized.includes('biweek') || normalized.includes('quinzen')) {
    return 14;
  }
  if (normalized.includes('month') || normalized.includes('mensal')) {
    return 30;
  }
  return 7;
}

/**
 * Next N check-in dates from today, stepped by the Watchtower cadence.
 */
export function buildWatchtowerSchedule(
  frequency: string,
  count = 4,
  from: Date = new Date(),
): Date[] {
  const step = cadenceDays(frequency);
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  // First occurrence is tomorrow so "today" does not look already due.
  const first = new Date(start.getTime() + DAY_MS);
  const dates: Date[] = [];
  for (let i = 0; i < count; i += 1) {
    dates.push(new Date(first.getTime() + i * step * DAY_MS));
  }
  return dates;
}

export function isValidReminderTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

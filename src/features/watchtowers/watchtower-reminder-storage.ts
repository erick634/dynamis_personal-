import type { WatchtowerReminderPrefs } from '@/features/watchtowers/watchtower-types';
import { isValidReminderTime } from '@/features/watchtowers/watchtower-schedule';

const STORAGE_PREFIX = 'dynamis-watchtower-reminder:';

function storageKey(recommendationId: string): string {
  return `${STORAGE_PREFIX}${recommendationId}`;
}

export function defaultReminderPrefs(suggestedTime: string): WatchtowerReminderPrefs {
  return {
    reminderEnabled: false,
    alarmEnabled: false,
    reminderTime: isValidReminderTime(suggestedTime) ? suggestedTime.trim() : '09:00',
  };
}

export function loadWatchtowerReminderPrefs(
  recommendationId: string,
  suggestedTime: string,
): WatchtowerReminderPrefs {
  const fallback = defaultReminderPrefs(suggestedTime);
  try {
    const raw = localStorage.getItem(storageKey(recommendationId));
    if (!raw) {
      return fallback;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return fallback;
    }
    const record = parsed as Record<string, unknown>;
    const reminderTime =
      typeof record.reminderTime === 'string' && isValidReminderTime(record.reminderTime)
        ? record.reminderTime.trim()
        : fallback.reminderTime;
    return {
      reminderEnabled: Boolean(record.reminderEnabled),
      alarmEnabled: Boolean(record.alarmEnabled),
      reminderTime,
    };
  } catch {
    return fallback;
  }
}

export function saveWatchtowerReminderPrefs(
  recommendationId: string,
  prefs: WatchtowerReminderPrefs,
): void {
  localStorage.setItem(storageKey(recommendationId), JSON.stringify(prefs));
}

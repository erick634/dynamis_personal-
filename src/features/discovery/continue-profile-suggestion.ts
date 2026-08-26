import type { TFunction } from 'i18next';

import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';
import type { Profile } from '@/features/profiles/profiles-types';

/** Latest activity timestamp (ms) for an area, or 0 if never touched. */
export function lifeAreaLastActivityMs(goals: LifeAreaUserGoal[] | undefined): number {
  if (!goals || goals.length === 0) return 0;
  let latest = 0;
  for (const goal of goals) {
    const created = Date.parse(goal.createdAt);
    if (!Number.isNaN(created)) latest = Math.max(latest, created);
    if (goal.completedAt) {
      const done = Date.parse(goal.completedAt);
      if (!Number.isNaN(done)) latest = Math.max(latest, done);
    }
    for (const task of goal.tasks) {
      for (const dateKey of task.completedDates) {
        const stamp = Date.parse(`${dateKey}T12:00:00`);
        if (!Number.isNaN(stamp)) latest = Math.max(latest, stamp);
      }
    }
  }
  return latest;
}

const STALE_AFTER_MS = 5 * 24 * 60 * 60 * 1000;

export function isLifeAreaStale(lastActivityMs: number, now = Date.now()): boolean {
  if (lastActivityMs <= 0) return true;
  return now - lastActivityMs >= STALE_AFTER_MS;
}

export function daysSinceActivity(ms: number, now = Date.now()): number {
  if (ms <= 0) return 999;
  return Math.max(0, Math.floor((now - ms) / (24 * 60 * 60 * 1000)));
}

/** Prefer the longest-idle active area; fall back to the first. */
export function pickSuggestedLifeAreaId(
  activeAreaIds: readonly LifeAreaId[],
  goalsByArea: Partial<Record<LifeAreaId, LifeAreaUserGoal[]>>,
): LifeAreaId | null {
  const firstArea = activeAreaIds[0];
  if (firstArea === undefined) return null;

  let suggested: LifeAreaId = firstArea;
  let oldest = Number.POSITIVE_INFINITY;

  for (const areaId of activeAreaIds) {
    const activity = lifeAreaLastActivityMs(goalsByArea[areaId]);
    const score = activity <= 0 ? 0 : activity;
    if (score < oldest) {
      oldest = score;
      suggested = areaId;
    }
  }

  return suggested;
}

/** True when activeFocus text seems to point at this life area label. */
export function focusMentionsArea(
  activeFocus: string | null | undefined,
  areaLabel: string,
): boolean {
  const focus = activeFocus?.trim().toLowerCase();
  if (!focus) return false;
  const label = areaLabel.trim().toLowerCase();
  if (!label) return false;
  return (
    focus.includes(label) ||
    label.split(/\s+/).some((part) => part.length > 3 && focus.includes(part))
  );
}

export function buildContinueProfileSuggestionCopy(input: {
  suggestedAreaId: LifeAreaId | null;
  staleProfile: Profile | null;
  goalsByArea: Partial<Record<LifeAreaId, LifeAreaUserGoal[]>>;
  activeFocus: string | null | undefined;
  now: number;
  t: TFunction;
}): string | null {
  const { suggestedAreaId, staleProfile, goalsByArea, activeFocus, now, t } = input;

  if (suggestedAreaId) {
    const areaLabel = t(`you.balanceRadar.areas.${suggestedAreaId}`);
    const activity = lifeAreaLastActivityMs(goalsByArea[suggestedAreaId]);
    const days = daysSinceActivity(activity, now);
    const focusNote = focusMentionsArea(activeFocus, areaLabel)
      ? ''
      : activeFocus?.trim()
        ? ` ${t('discovery.intent.continueProfile.focusCaveat', { focus: activeFocus.trim() })}`
        : '';

    if (activity <= 0) {
      return `${t('discovery.intent.continueProfile.suggestNever', { name: areaLabel })}${focusNote}`;
    }
    if (isLifeAreaStale(activity, now)) {
      return `${t('discovery.intent.continueProfile.suggestStale', {
        name: areaLabel,
        days,
      })}${focusNote}`;
    }
    return `${t('discovery.intent.continueProfile.suggestDefault', { name: areaLabel })}${focusNote}`;
  }

  if (staleProfile) {
    const updatedMs = Date.parse(staleProfile.updated_at);
    const days = daysSinceActivity(Number.isNaN(updatedMs) ? 0 : updatedMs, now);
    const focusNote = activeFocus?.trim()
      ? ` ${t('discovery.intent.continueProfile.focusCaveat', { focus: activeFocus.trim() })}`
      : '';
    return `${t('discovery.intent.continueProfile.suggestStale', {
      name: staleProfile.title,
      days,
    })}${focusNote}`;
  }

  return null;
}

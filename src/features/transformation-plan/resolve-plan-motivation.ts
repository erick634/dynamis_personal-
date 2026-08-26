import type { TFunction } from 'i18next';

import type { LifeAreaContent } from '@/features/intent-profile/life-area-content';
import { buildGoalProgressByArea } from '@/features/intent-profile/life-area-scores';
import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';
import { resolveLifeAreaMotto } from '@/features/intent-profile/resolve-life-area-motto';

type ResolvePlanMotivationInput = {
  activeAreaIds: readonly LifeAreaId[];
  contentByArea: Partial<Record<LifeAreaId, LifeAreaContent>>;
  goalsByArea: Partial<Record<LifeAreaId, LifeAreaUserGoal[]>>;
  activeFocus: string | null | undefined;
  t: TFunction;
};

/**
 * Prefer the motto of the strongest life area, then Intent Profile focus,
 * else a Plan fallback line.
 */
export function resolvePlanMotivation({
  activeAreaIds,
  contentByArea,
  goalsByArea,
  activeFocus,
  t,
}: ResolvePlanMotivationInput): string {
  if (activeAreaIds.length > 0) {
    const progressByArea = buildGoalProgressByArea(goalsByArea);
    const firstAreaId = activeAreaIds[0];
    if (!firstAreaId) {
      return t('transformationPlan.motivation.fallback');
    }

    let bestAreaId: LifeAreaId = firstAreaId;
    let bestScore = -1;

    for (const areaId of activeAreaIds) {
      const score = progressByArea[areaId] ?? -1;
      if (score > bestScore) {
        bestScore = score;
        bestAreaId = areaId;
      }
    }

    const stored = contentByArea[bestAreaId]?.motivationalPhrase ?? '';
    const motto = resolveLifeAreaMotto(bestAreaId, stored, t).trim();
    if (motto) return motto;
  }

  const focus = activeFocus?.trim();
  if (focus) return focus;

  return t('transformationPlan.motivation.fallback');
}

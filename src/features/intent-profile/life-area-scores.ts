import { averageAreaGoalProgress } from '@/features/intent-profile/life-area-goal-progress';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';

export const LIFE_AREA_IDS = [
  'professional',
  'health',
  'studies',
  'spirituality',
  'leisure',
  'family',
  'economy',
] as const;

export type LifeAreaId = (typeof LIFE_AREA_IDS)[number];

export type LifeAreaScore = {
  id: LifeAreaId;
  score: number;
};

export const LIFE_AREA_DOT_COLOR: Record<LifeAreaId, string> = {
  professional: '#1c4a7e',
  health: '#2ebc8f',
  studies: '#4f7cff',
  spirituality: '#8b5cf6',
  leisure: '#eab308',
  family: '#ec4899',
  economy: '#14b8a6',
};

const PLACEHOLDER_SCORES: Record<Exclude<LifeAreaId, 'professional'>, number> = {
  health: 45,
  studies: 62,
  spirituality: 38,
  leisure: 55,
  family: 70,
  economy: 50,
};

function baseAreaScore(areaId: LifeAreaId, professionalScore: number): number {
  if (areaId === 'professional') {
    return Math.max(0, Math.min(100, Math.round(professionalScore)));
  }
  return PLACEHOLDER_SCORES[areaId];
}

export function buildGoalProgressByArea(
  goalsByArea: Partial<Record<LifeAreaId, LifeAreaUserGoal[]>>,
): Partial<Record<LifeAreaId, number>> {
  const result: Partial<Record<LifeAreaId, number>> = {};
  for (const id of LIFE_AREA_IDS) {
    const goals = goalsByArea[id];
    if (!goals || goals.length === 0) continue;
    const average = averageAreaGoalProgress(goals);
    if (average !== null) {
      result[id] = average;
    }
  }
  return result;
}

/**
 * Life-area score for radar / ring.
 * When the area has goals, score follows average session progress across those goals.
 * Otherwise falls back to profile clarity (professional) or placeholder.
 */
export function buildLifeAreaScores(
  professionalScore: number,
  activeAreaIds: readonly LifeAreaId[] = LIFE_AREA_IDS,
  goalProgressByArea: Partial<Record<LifeAreaId, number>> = {},
): LifeAreaScore[] {
  const active = new Set(activeAreaIds);

  return LIFE_AREA_IDS.filter((id) => active.has(id)).map((id) => {
    const goalScore = goalProgressByArea[id];
    const score =
      typeof goalScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(goalScore)))
        : baseAreaScore(id, professionalScore);
    return { id, score };
  });
}

export function scoreBand(score: number): 'high' | 'mid' | 'low' {
  if (score >= 76) return 'high';
  if (score >= 51) return 'mid';
  return 'low';
}

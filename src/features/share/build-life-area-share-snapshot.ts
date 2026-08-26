import type { LifeAreaContent } from '@/features/intent-profile/life-area-content';
import { getGoalOccurrenceProgress } from '@/features/intent-profile/life-area-goal-progress';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';
import { resolveGrowingGoalStatus } from '@/features/intent-profile/life-area-growing-status';
import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import type { LifeAreaSharePayload } from '@/features/share/life-area-share-types';

type BuildLifeAreaShareSnapshotInput = {
  areaId: LifeAreaId;
  areaLabel: string;
  summary: string;
  motto: string;
  score: number;
  displayName: string | null;
  content: LifeAreaContent;
  goals: LifeAreaUserGoal[];
};

export function buildLifeAreaShareSnapshot(
  input: BuildLifeAreaShareSnapshotInput,
): LifeAreaSharePayload {
  const goals = input.goals.map((goal) => {
    const progress = getGoalOccurrenceProgress(goal);
    const status = resolveGrowingGoalStatus(goal);
    return {
      title: goal.title,
      percent: progress.percent,
      completed: progress.completed,
      total: progress.total,
      status,
      isAchievement: progress.percent >= 100 || Boolean(goal.completedAt),
      tasks: goal.tasks.map((task) => ({
        title: task.title,
        cadence: task.schedule.cadence,
      })),
    };
  });

  return {
    areaId: input.areaId,
    areaLabel: input.areaLabel,
    summary: input.summary.trim(),
    motto: input.motto.trim(),
    score: Math.max(0, Math.min(100, Math.round(input.score))),
    displayName: input.displayName?.trim() || null,
    goals,
    links: input.content.links.map((link) => ({
      id: link.id,
      label: link.label,
      url: link.url,
    })),
    documents: input.content.documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      url: doc.url,
    })),
    images: input.content.images.map((image) => ({
      id: image.id,
      name: image.name,
      dataUrl: image.dataUrl,
    })),
  };
}

import type { TFunction } from 'i18next';

import type { LifeAreaAgentSuggestion } from '@/features/intent-profile/life-area-agent-suggestion-types';
import { suggestionTasksToInputs } from '@/features/intent-profile/life-area-agent-suggestion-types';
import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { useLifeAreas } from '@/features/intent-profile/use-life-areas';

/** Apply an Unlock suggestion into the life-area goals/assets stores. */
export function applyLifeAreaAgentSuggestion(
  areaId: LifeAreaId,
  suggestion: LifeAreaAgentSuggestion,
  t: TFunction,
): void {
  const goalsState = useLifeAreaGoals.getState();
  const goals = goalsState.goalsByArea[areaId] ?? [];
  const { addGoal, addTask } = goalsState;
  const { addLink } = useLifeAreas.getState();

  if (suggestion.goal) {
    const taskInputs = suggestionTasksToInputs(suggestion.goal.tasks);
    if (suggestion.goal.mode === 'existing') {
      const matchTitle = (suggestion.goal.existingGoalTitle ?? suggestion.goal.title)
        .trim()
        .toLowerCase();
      const existing = goals.find((goal) => goal.title.trim().toLowerCase() === matchTitle);
      if (existing) {
        for (const task of taskInputs) {
          addTask(areaId, existing.id, task);
        }
      } else {
        addGoal(areaId, suggestion.goal.title, taskInputs, suggestion.goal.horizonMonths);
      }
    } else {
      addGoal(areaId, suggestion.goal.title, taskInputs, suggestion.goal.horizonMonths);
    }
  }

  for (const resource of suggestion.resources) {
    const kindLabel = t(`you.lifeArea.agentSuggestion.resourceKind.${resource.kind}`);
    addLink(areaId, {
      label: `${kindLabel}: ${resource.title}`,
      url: resource.url,
      progressReason: resource.why,
      goalId: null,
    });
  }
}

import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import type {
  GoalHorizonMonths,
  GoalTaskInput,
  TaskSchedule,
} from '@/features/intent-profile/life-area-goals-types';
import { DEFAULT_GOAL_PRIORITY } from '@/features/intent-profile/life-area-goals-types';

export type LifeAreaSuggestionResourceKind = 'book' | 'site' | 'youtube';

export type LifeAreaSuggestionTask = {
  title: string;
  schedule: TaskSchedule;
  durationMinutes: number | null;
};

export type LifeAreaSuggestionGoal = {
  mode: 'new' | 'existing';
  title: string;
  existingGoalTitle: string | null;
  horizonMonths: GoalHorizonMonths;
  tasks: LifeAreaSuggestionTask[];
};

export type LifeAreaSuggestionResource = {
  kind: LifeAreaSuggestionResourceKind;
  title: string;
  url: string;
  why: string;
};

export type LifeAreaAgentSuggestion = {
  rationale: string;
  goal: LifeAreaSuggestionGoal | null;
  resources: LifeAreaSuggestionResource[];
};

export type FetchLifeAreaSuggestionInput = {
  userId: string;
  areaId: LifeAreaId;
  areaLabel: string;
  locale: string;
  summary: string;
  motto: string;
  profileFocus: string;
  existingGoals: Array<{ title: string; tasks: string[] }>;
  existingLinks: Array<{ label: string; url: string }>;
};

function toTaskInput(task: LifeAreaSuggestionTask): GoalTaskInput {
  return {
    title: task.title,
    schedule: task.schedule,
    durationMinutes: task.durationMinutes,
    priority: DEFAULT_GOAL_PRIORITY,
  };
}

export function suggestionTasksToInputs(tasks: LifeAreaSuggestionTask[]): GoalTaskInput[] {
  return tasks.map(toTaskInput);
}

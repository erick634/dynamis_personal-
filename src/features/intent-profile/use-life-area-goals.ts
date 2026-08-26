import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { toDateKey } from '@/features/intent-profile/format-task-schedule';
import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import { LIFE_AREA_IDS } from '@/features/intent-profile/life-area-scores';
import type {
  GoalHorizonMonths,
  GoalPriority,
  GoalTaskInput,
  LifeAreaUserGoal,
  TaskSchedule,
} from '@/features/intent-profile/life-area-goals-types';
import { DEFAULT_GOAL_PRIORITY } from '@/features/intent-profile/life-area-goals-types';
import { parsePersistedGoal } from '@/features/intent-profile/parse-life-area-goals-storage';

export type LifeAreaGoalSuggestionTask = {
  title: string;
  schedule: TaskSchedule;
  durationMinutes: number | null;
};

export type LifeAreaGoalSuggestion = {
  areaId: LifeAreaId;
  title: string;
  horizonMonths: GoalHorizonMonths;
  tasks: LifeAreaGoalSuggestionTask[];
};

type LifeAreaGoalsState = {
  goalsByArea: Partial<Record<LifeAreaId, LifeAreaUserGoal[]>>;
  getGoals: (areaId: LifeAreaId) => LifeAreaUserGoal[];
  addGoal: (
    areaId: LifeAreaId,
    title: string,
    tasks: GoalTaskInput[],
    horizonMonths: GoalHorizonMonths,
    priority?: GoalPriority,
  ) => string | null;
  applySuggestion: (suggestion: LifeAreaGoalSuggestion) => string | null;
  updateGoalTitle: (areaId: LifeAreaId, goalId: string, title: string) => void;
  setGoalCompleted: (areaId: LifeAreaId, goalId: string, completed: boolean) => void;
  setGoalPriority: (areaId: LifeAreaId, goalId: string, priority: GoalPriority) => void;
  removeGoal: (areaId: LifeAreaId, goalId: string) => void;
  addTask: (areaId: LifeAreaId, goalId: string, task: GoalTaskInput) => void;
  updateTask: (
    areaId: LifeAreaId,
    goalId: string,
    taskId: string,
    patch: Partial<GoalTaskInput>,
  ) => void;
  removeTask: (areaId: LifeAreaId, goalId: string, taskId: string) => void;
  /** Toggle completion for a calendar day (defaults to today). */
  toggleTaskDate: (areaId: LifeAreaId, goalId: string, taskId: string, dateKey?: string) => void;
  skipTaskDate: (areaId: LifeAreaId, goalId: string, taskId: string, dateKey?: string) => void;
  unskipTaskDate: (areaId: LifeAreaId, goalId: string, taskId: string, dateKey?: string) => void;
};

function newId(): string {
  return crypto.randomUUID();
}

function isLifeAreaId(value: string): value is LifeAreaId {
  return (LIFE_AREA_IDS as readonly string[]).includes(value);
}

function mapGoals(
  state: LifeAreaGoalsState,
  areaId: LifeAreaId,
  updater: (goals: LifeAreaUserGoal[]) => LifeAreaUserGoal[],
): Partial<Record<LifeAreaId, LifeAreaUserGoal[]>> {
  return {
    ...state.goalsByArea,
    [areaId]: updater(state.goalsByArea[areaId] ?? []),
  };
}

function buildGoal(
  areaId: LifeAreaId,
  title: string,
  tasks: GoalTaskInput[],
  horizonMonths: GoalHorizonMonths,
  priority: GoalPriority = DEFAULT_GOAL_PRIORITY,
): LifeAreaUserGoal | null {
  const trimmed = title.trim();
  const validTasks = tasks
    .map((task) => ({
      title: task.title.trim(),
      schedule: task.schedule,
      durationMinutes: task.durationMinutes,
      priority: task.priority,
    }))
    .filter((task) => task.title.length > 0);
  if (!trimmed || validTasks.length === 0) return null;
  return {
    id: newId(),
    areaId,
    title: trimmed,
    horizonMonths,
    priority,
    createdAt: new Date().toISOString(),
    completedAt: null,
    tasks: validTasks.map((task) => ({
      id: newId(),
      title: task.title,
      schedule: task.schedule,
      durationMinutes: task.durationMinutes,
      priority: task.priority,
      completedDates: [],
      skippedDates: [],
    })),
  };
}

function patchTaskDates(
  state: LifeAreaGoalsState,
  areaId: LifeAreaId,
  goalId: string,
  taskId: string,
  updater: (task: LifeAreaUserGoal['tasks'][number]) => LifeAreaUserGoal['tasks'][number],
): Partial<Record<LifeAreaId, LifeAreaUserGoal[]>> {
  return mapGoals(state, areaId, (goals) =>
    goals.map((goal) => {
      if (goal.id !== goalId) return goal;
      return {
        ...goal,
        tasks: goal.tasks.map((task) => (task.id === taskId ? updater(task) : task)),
      };
    }),
  );
}

export const useLifeAreaGoals = create<LifeAreaGoalsState>()(
  persist(
    (set, get) => ({
      goalsByArea: {},
      getGoals: (areaId) => get().goalsByArea[areaId] ?? [],
      addGoal: (areaId, title, tasks, horizonMonths, priority = DEFAULT_GOAL_PRIORITY) => {
        const goal = buildGoal(areaId, title, tasks, horizonMonths, priority);
        if (!goal) return null;
        set((state) => ({
          goalsByArea: mapGoals(state, areaId, (goals) => [...goals, goal]),
        }));
        return goal.id;
      },
      applySuggestion: (suggestion) =>
        get().addGoal(
          suggestion.areaId,
          suggestion.title,
          suggestion.tasks.map((task) => ({
            title: task.title,
            schedule: task.schedule,
            durationMinutes: task.durationMinutes,
            priority: DEFAULT_GOAL_PRIORITY,
          })),
          suggestion.horizonMonths,
        ),
      updateGoalTitle: (areaId, goalId, title) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        set((state) => ({
          goalsByArea: mapGoals(state, areaId, (goals) =>
            goals.map((goal) => (goal.id === goalId ? { ...goal, title: trimmed } : goal)),
          ),
        }));
      },
      setGoalCompleted: (areaId, goalId, completed) => {
        set((state) => ({
          goalsByArea: mapGoals(state, areaId, (goals) =>
            goals.map((goal) =>
              goal.id === goalId
                ? {
                    ...goal,
                    completedAt: completed ? new Date().toISOString() : null,
                  }
                : goal,
            ),
          ),
        }));
      },
      setGoalPriority: (areaId, goalId, priority) => {
        set((state) => ({
          goalsByArea: mapGoals(state, areaId, (goals) =>
            goals.map((goal) => (goal.id === goalId ? { ...goal, priority } : goal)),
          ),
        }));
      },
      removeGoal: (areaId, goalId) => {
        set((state) => ({
          goalsByArea: mapGoals(state, areaId, (goals) =>
            goals.filter((goal) => goal.id !== goalId),
          ),
        }));
      },
      addTask: (areaId, goalId, task) => {
        const title = task.title.trim();
        if (!title) return;
        set((state) => ({
          goalsByArea: mapGoals(state, areaId, (goals) =>
            goals.map((goal) => {
              if (goal.id !== goalId) return goal;
              return {
                ...goal,
                tasks: [
                  ...goal.tasks,
                  {
                    id: newId(),
                    title,
                    schedule: task.schedule,
                    durationMinutes: task.durationMinutes,
                    priority: task.priority,
                    completedDates: [],
                    skippedDates: [],
                  },
                ],
              };
            }),
          ),
        }));
      },
      updateTask: (areaId, goalId, taskId, patch) => {
        set((state) => ({
          goalsByArea: mapGoals(state, areaId, (goals) =>
            goals.map((goal) => {
              if (goal.id !== goalId) return goal;
              return {
                ...goal,
                tasks: goal.tasks.map((task) => {
                  if (task.id !== taskId) return task;
                  return {
                    ...task,
                    title:
                      patch.title !== undefined ? patch.title.trim() || task.title : task.title,
                    schedule: patch.schedule ?? task.schedule,
                    durationMinutes:
                      patch.durationMinutes !== undefined
                        ? patch.durationMinutes
                        : task.durationMinutes,
                    priority: patch.priority ?? task.priority,
                  };
                }),
              };
            }),
          ),
        }));
      },
      removeTask: (areaId, goalId, taskId) => {
        set((state) => ({
          goalsByArea: mapGoals(state, areaId, (goals) =>
            goals.map((goal) => {
              if (goal.id !== goalId) return goal;
              if (goal.tasks.length <= 1) return goal;
              return {
                ...goal,
                tasks: goal.tasks.filter((task) => task.id !== taskId),
              };
            }),
          ),
        }));
      },
      toggleTaskDate: (areaId, goalId, taskId, dateKey = toDateKey()) => {
        set((state) => ({
          goalsByArea: patchTaskDates(state, areaId, goalId, taskId, (task) => {
            const isCompleted = task.completedDates.includes(dateKey);
            if (isCompleted) {
              return {
                ...task,
                completedDates: task.completedDates.filter((item) => item !== dateKey),
              };
            }
            return {
              ...task,
              completedDates: [...task.completedDates, dateKey],
              skippedDates: task.skippedDates.filter((item) => item !== dateKey),
            };
          }),
        }));
      },
      skipTaskDate: (areaId, goalId, taskId, dateKey = toDateKey()) => {
        set((state) => ({
          goalsByArea: patchTaskDates(state, areaId, goalId, taskId, (task) => {
            if (task.skippedDates.includes(dateKey)) return task;
            return {
              ...task,
              skippedDates: [...task.skippedDates, dateKey],
              completedDates: task.completedDates.filter((item) => item !== dateKey),
            };
          }),
        }));
      },
      unskipTaskDate: (areaId, goalId, taskId, dateKey = toDateKey()) => {
        set((state) => ({
          goalsByArea: patchTaskDates(state, areaId, goalId, taskId, (task) => ({
            ...task,
            skippedDates: task.skippedDates.filter((item) => item !== dateKey),
          })),
        }));
      },
    }),
    {
      name: 'dynamis-life-area-goals',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ goalsByArea: state.goalsByArea }),
      merge: (persisted, current) => {
        const raw = persisted as { goalsByArea?: unknown } | undefined;
        const goalsByArea: Partial<Record<LifeAreaId, LifeAreaUserGoal[]>> = {};
        if (raw?.goalsByArea && typeof raw.goalsByArea === 'object') {
          for (const [key, value] of Object.entries(raw.goalsByArea)) {
            if (!isLifeAreaId(key) || !Array.isArray(value)) continue;
            goalsByArea[key] = value.flatMap((item) => {
              const parsed = parsePersistedGoal(item, key);
              return parsed ? [parsed] : [];
            });
          }
        }
        return { ...current, goalsByArea };
      },
    },
  ),
);

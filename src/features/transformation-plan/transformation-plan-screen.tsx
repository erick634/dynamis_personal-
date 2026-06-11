import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { BrandMark } from '@/components/ui/brand-mark';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PlanFilter, type PlanFilterId } from '@/features/transformation-plan/plan-filter';
import { PlanTrailMap, type TrailNode } from '@/features/transformation-plan/plan-trail-map';
import {
  applyStreakOnMark,
  createEmptyStreakData,
  getPlanForUser,
  savePlanForUser,
  clearPlanForUser,
  type StreakData,
} from '@/features/transformation-plan/plan-storage';
import { fetchGeneratedPlan } from '@/features/transformation-plan/transformation-plan-llm-api';
import { MOCK_PLAN_GOALS } from '@/features/transformation-plan/transformation-plan-mock';
import {
  getReflectionDidToday,
  isReflectionTodayGoalId,
  reflectionItemsToGoals,
} from '@/features/transformation-plan/reflection-today-storage';
import { queryClient } from '@/lib/api';
import { useCurrentUser } from '@/stores/current-user';
import type { DynamisGoal } from '@/types/energeia';

function filterPlanGoals(goals: DynamisGoal[], filter: PlanFilterId): DynamisGoal[] {
  switch (filter) {
    case 'today':
      return goals.filter((goal) => goal.dueLabelKey === 'todayAt');
    case 'high':
      return goals.filter((goal) => goal.priority === 'high');
    case 'build':
      return goals.filter((goal) => goal.tag === 'build');
    default:
      return goals;
  }
}

function buildVisibleGoals(
  planGoals: DynamisGoal[],
  reflectionTodayGoals: DynamisGoal[],
  filter: PlanFilterId,
): DynamisGoal[] {
  if (filter === 'today') {
    const scheduledToday = planGoals.filter((goal) => goal.dueLabelKey === 'todayAt');
    return [...reflectionTodayGoals, ...scheduledToday];
  }
  return filterPlanGoals(planGoals, filter);
}

function buildInitialRealizedIds(goals: DynamisGoal[]): Set<string> {
  return new Set(goals.filter((goal) => goal.realized).map((goal) => goal.id));
}

function syncGoalsWithRealizedIds(goals: DynamisGoal[], realizedIds: Set<string>): DynamisGoal[] {
  return goals.map((goal) => {
    const realized = realizedIds.has(goal.id);
    return {
      ...goal,
      realized,
      realizedAt: realized ? (goal.realizedAt ?? new Date().toISOString()) : null,
    };
  });
}

const PLAN_FILTER_IDS: PlanFilterId[] = ['all', 'today', 'high', 'build'];

function isPlanFilterId(value: string | null): value is PlanFilterId {
  return value != null && PLAN_FILTER_IDS.includes(value as PlanFilterId);
}

export function TransformationPlanScreen() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const userId = useCurrentUser((state) => state.user?.userId);
  const [activeFilter, setActiveFilter] = useState<PlanFilterId>(() => {
    const fromUrl = searchParams.get('filter');
    return isPlanFilterId(fromUrl) ? fromUrl : 'all';
  });
  const [goals, setGoals] = useState<DynamisGoal[]>(MOCK_PLAN_GOALS);
  const [realizedIds, setRealizedIds] = useState<Set<string>>(() =>
    buildInitialRealizedIds(MOCK_PLAN_GOALS),
  );
  const [streakData, setStreakData] = useState<StreakData>(createEmptyStreakData);
  const [generatedAt, setGeneratedAt] = useState<string>(() => new Date().toISOString());
  const [hasPersistedPlan, setHasPersistedPlan] = useState(false);
  const [planStorageReady, setPlanStorageReady] = useState(false);
  const [showNewPlanConfirm, setShowNewPlanConfirm] = useState(false);
  const [reflectionTodayGoals, setReflectionTodayGoals] = useState<DynamisGoal[]>([]);

  const goalsHydratedRef = useRef(false);
  const streakDataRef = useRef(streakData);

  useEffect(() => {
    streakDataRef.current = streakData;
  }, [streakData]);

  useEffect(() => {
    const fromUrl = searchParams.get('filter');
    if (isPlanFilterId(fromUrl)) {
      setActiveFilter(fromUrl);
    }
  }, [searchParams]);

  const persistPlan = useCallback(
    (
      nextGoals: DynamisGoal[],
      nextRealizedIds: Set<string>,
      nextStreakData: StreakData,
      nextGeneratedAt: string,
    ) => {
      if (!userId) {
        return;
      }
      savePlanForUser(userId, {
        userId,
        goals: nextGoals,
        realizedIds: Array.from(nextRealizedIds),
        streakData: nextStreakData,
        generatedAt: nextGeneratedAt,
      });
    },
    [userId],
  );

  useEffect(() => {
    goalsHydratedRef.current = false;
    setPlanStorageReady(false);
    setHasPersistedPlan(false);

    if (!userId) {
      setGoals(MOCK_PLAN_GOALS);
      setRealizedIds(buildInitialRealizedIds(MOCK_PLAN_GOALS));
      setStreakData(createEmptyStreakData());
      setPlanStorageReady(true);
      return;
    }

    const persisted = getPlanForUser(userId);
    if (persisted) {
      const loadedRealizedIds = new Set(persisted.realizedIds);
      setGoals(syncGoalsWithRealizedIds(persisted.goals, loadedRealizedIds));
      setRealizedIds(loadedRealizedIds);
      setStreakData(persisted.streakData);
      setGeneratedAt(persisted.generatedAt);
      setHasPersistedPlan(true);
      goalsHydratedRef.current = true;
    }

    setPlanStorageReady(true);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setReflectionTodayGoals([]);
      return;
    }
    setReflectionTodayGoals(reflectionItemsToGoals(getReflectionDidToday(userId)));
  }, [userId]);

  const { data: llmGoals, isLoading: isPlanLoading } = useQuery({
    queryKey: ['transformation-plan-llm', userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('userId is required');
      }
      return fetchGeneratedPlan(userId);
    },
    enabled: Boolean(userId) && planStorageReady && !hasPersistedPlan,
    staleTime: Infinity,
    gcTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (!userId || hasPersistedPlan) {
      return;
    }
    if (goalsHydratedRef.current) {
      return;
    }
    if (isPlanLoading) {
      return;
    }

    const rawGoals = llmGoals != null && llmGoals.length > 0 ? llmGoals : MOCK_PLAN_GOALS;
    const nextRealizedIds = new Set<string>();
    const nextGoals = syncGoalsWithRealizedIds(rawGoals, nextRealizedIds);
    const nextGeneratedAt = new Date().toISOString();

    setGoals(nextGoals);
    setRealizedIds(nextRealizedIds);
    setGeneratedAt(nextGeneratedAt);

    persistPlan(nextGoals, nextRealizedIds, streakDataRef.current, nextGeneratedAt);
    setHasPersistedPlan(true);
    goalsHydratedRef.current = true;
  }, [userId, hasPersistedPlan, isPlanLoading, llmGoals, persistPlan]);

  const filteredGoals = useMemo(
    () => buildVisibleGoals(goals, reflectionTodayGoals, activeFilter),
    [goals, reflectionTodayGoals, activeFilter],
  );

  const trailNodes = useMemo((): TrailNode[] => {
    let foundCurrent = false;

    return filteredGoals.map((goal) => {
      const resolvedTitle = goal.title ?? t(`transformationPlan.items.${goal.id}.title`);
      const isDone = goal.realized;
      let state: TrailNode['state'];

      if (isDone) {
        state = 'done';
      } else if (!foundCurrent) {
        state = 'current';
        foundCurrent = true;
      } else {
        state = 'locked';
      }

      return {
        goal,
        resolvedTitle,
        state,
        tone: goal.tag === 'build' ? 'ember' : 'blue',
      };
    });
  }, [filteredGoals, t]);

  const handleToggleRealized = (goalId: string, realized: boolean) => {
    if (isReflectionTodayGoalId(goalId)) {
      return;
    }

    const wasRealized = realizedIds.has(goalId);

    let nextStreakData = streakData;
    if (realized && !wasRealized) {
      nextStreakData = applyStreakOnMark(streakData);
    }
    // POC: unmarking a goal does not roll back streak (already counted for the day).

    const nextRealizedIds = new Set(realizedIds);
    if (realized) {
      nextRealizedIds.add(goalId);
    } else {
      nextRealizedIds.delete(goalId);
    }

    const nextGoals = goals.map((goal) => {
      if (goal.id !== goalId) {
        return goal;
      }
      if (realized) {
        // eslint-disable-next-line no-console -- TODO(livekit): replace with data channel emit
        console.warn('TODO: emit energeia.realized via data channel', { goal_id: goalId });
      }
      return {
        ...goal,
        realized,
        realizedAt: realized ? new Date().toISOString() : null,
      };
    });

    setRealizedIds(nextRealizedIds);
    setGoals(nextGoals);
    setStreakData(nextStreakData);
    persistPlan(nextGoals, nextRealizedIds, nextStreakData, generatedAt);
  };

  const handleConfirmNewPlan = async () => {
    if (!userId) {
      return;
    }

    setShowNewPlanConfirm(false);
    clearPlanForUser(userId);
    setHasPersistedPlan(false);
    goalsHydratedRef.current = false;

    await queryClient.invalidateQueries({
      queryKey: ['transformation-plan-llm', userId],
    });
  };

  return (
    <div className="min-h-dvh bg-bg font-body text-ink">
      <header className="border-b border-line-soft bg-white px-6 py-5 md:px-10">
        <BrandMark />
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
        <p className="font-body text-xs font-semibold tracking-[0.18em] text-blue uppercase">
          {t('transformationPlan.eyebrow')}
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-ink">
          {t('transformationPlan.title')}
        </h1>

        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PlanFilter activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            <button
              type="button"
              onClick={() => {
                if (userId) {
                  setShowNewPlanConfirm(true);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 font-body text-xs font-medium text-ink-2 transition-colors hover:text-ink"
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
              {t('transformationPlan.newPlanButton')}
            </button>
          </div>

          <PlanTrailMap nodes={trailNodes} onToggleRealized={handleToggleRealized} />

          {filteredGoals.length === 0 ? (
            <p className="mt-6 font-body text-sm text-ink-2">
              {t('transformationPlan.emptyFilter')}
            </p>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={showNewPlanConfirm}
        title={t('transformationPlan.newPlanConfirmTitle')}
        description={t('transformationPlan.newPlanConfirmDescription')}
        confirmLabel={t('transformationPlan.newPlanConfirmAction')}
        cancelLabel={t('common.cancel')}
        destructive={false}
        onConfirm={() => {
          void handleConfirmNewPlan();
        }}
        onCancel={() => {
          setShowNewPlanConfirm(false);
        }}
      />
    </div>
  );
}

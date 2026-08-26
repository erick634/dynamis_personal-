import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { BrandMark } from '@/components/ui/brand-mark';
import type { GoalTaskInput } from '@/features/intent-profile/life-area-goals-types';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { useLifeAreas } from '@/features/intent-profile/use-life-areas';
import { listProfiles } from '@/features/profiles/profiles-api';
import { PlanFilter, type PlanFilterId } from '@/features/transformation-plan/plan-filter';
import { PlanLifeAreaTaskItem } from '@/features/transformation-plan/plan-life-area-task-item';
import {
  buildPlanLifeAreaTaskRows,
  type PlanLifeAreaTaskRow,
} from '@/features/transformation-plan/plan-life-area-tasks';
import { PlanProgressChart } from '@/features/transformation-plan/plan-progress-chart';
import { resolvePlanMotivation } from '@/features/transformation-plan/resolve-plan-motivation';
import { useIntentProfile } from '@/features/you/use-intent-profile';
import { useCurrentUser } from '@/stores/current-user';

const PLAN_FILTER_IDS: PlanFilterId[] = ['all', 'today', 'week', 'month'];
const PROFILES_QUERY_KEY = 'profiles' as const;

function isPlanFilterId(value: string | null): value is PlanFilterId {
  return value != null && PLAN_FILTER_IDS.includes(value as PlanFilterId);
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function pickPrimaryProfileTitle(
  profiles: { title: string; is_primary: boolean }[] | undefined,
): string | null {
  if (!profiles || profiles.length === 0) return null;
  const primary = profiles.find((profile) => profile.is_primary) ?? profiles[0];
  if (!primary) return null;
  return firstNonEmpty(primary.title);
}

export function TransformationPlanScreen() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const user = useCurrentUser((state) => state.user);
  const { profile } = useIntentProfile();
  const goalsByArea = useLifeAreaGoals((state) => state.goalsByArea);
  const toggleTaskDate = useLifeAreaGoals((state) => state.toggleTaskDate);
  const updateTask = useLifeAreaGoals((state) => state.updateTask);
  const activeAreaIds = useLifeAreas((state) => state.activeAreaIds);
  const contentByArea = useLifeAreas((state) => state.contentByArea);

  const { data: profiles } = useQuery({
    queryKey: [PROFILES_QUERY_KEY, user?.userId],
    queryFn: () => {
      if (!user?.userId) throw new Error('userId is required');
      return listProfiles(user.userId);
    },
    enabled: Boolean(user?.userId),
  });

  const [activeFilter, setActiveFilter] = useState<PlanFilterId>(() => {
    const fromUrl = searchParams.get('filter');
    return isPlanFilterId(fromUrl) ? fromUrl : 'today';
  });

  useEffect(() => {
    const fromUrl = searchParams.get('filter');
    if (isPlanFilterId(fromUrl)) {
      setActiveFilter(fromUrl);
    }
  }, [searchParams]);

  const rows = useMemo(
    () => buildPlanLifeAreaTaskRows(goalsByArea, activeFilter),
    [goalsByArea, activeFilter],
  );

  const profileLabel =
    firstNonEmpty(
      pickPrimaryProfileTitle(profiles),
      profile?.roleContext,
      profile?.displayName,
      user?.displayName,
    ) ?? t('transformationPlan.profile.fallback');

  const motivation = useMemo(
    () =>
      resolvePlanMotivation({
        activeAreaIds,
        contentByArea,
        goalsByArea,
        activeFocus: profile?.activeFocus,
        t,
      }),
    [activeAreaIds, contentByArea, goalsByArea, profile?.activeFocus, t],
  );

  function handleToggleDone(row: PlanLifeAreaTaskRow) {
    if (row.skipped) return;
    toggleTaskDate(row.areaId, row.goalId, row.taskId, row.focusDateKey);
  }

  function handleSaveTask(row: PlanLifeAreaTaskRow, payload: GoalTaskInput) {
    updateTask(row.areaId, row.goalId, row.taskId, payload);
  }

  return (
    <div className="w-full min-w-0 bg-bg font-body text-ink">
      <header className="border-b border-line-soft bg-white px-4 py-4 sm:px-6 md:px-10 md:py-5">
        <BrandMark />
      </header>

      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 md:px-8 md:py-10 lg:px-10">
        <p className="font-body text-xs font-semibold tracking-[0.18em] text-blue uppercase">
          {t('transformationPlan.eyebrow')}
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.5rem,4vw,2.5rem)] font-semibold break-words text-ink">
          {t('transformationPlan.title')}
        </h1>

        <p className="mt-3 inline-flex max-w-full items-center rounded-full bg-blue-soft/70 px-3 py-1 font-body text-xs font-semibold text-blue">
          {t('transformationPlan.profile.belongsTo', { profile: profileLabel })}
        </p>

        <blockquote className="mt-4 max-w-2xl border-l-2 border-blue/40 pl-4 font-display text-base text-ink-2 italic sm:text-lg">
          {motivation}
        </blockquote>

        <p className="mt-3 max-w-2xl font-body text-sm text-ink-2">
          {t('transformationPlan.lifeAreaTasks.subtitle')}
        </p>

        <div className="mt-8">
          <PlanFilter activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        </div>

        <div className="mt-6">
          <PlanProgressChart rows={rows} filter={activeFilter} />
        </div>

        <div className="mt-8">
          {rows.length === 0 ? (
            <p className="font-body text-sm text-ink-2">
              {t('transformationPlan.lifeAreaTasks.empty')}
            </p>
          ) : (
            <ul className="list-none space-y-3 p-0">
              {rows.map((row) => (
                <PlanLifeAreaTaskItem
                  key={row.id}
                  row={row}
                  onToggleDone={handleToggleDone}
                  onSaveTask={handleSaveTask}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

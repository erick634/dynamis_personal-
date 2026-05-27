import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/ui/brand-mark';
import { DynamisTree } from '@/features/transformation-plan/dynamis-tree';
import { PlanFilter, type PlanFilterId } from '@/features/transformation-plan/plan-filter';
import { PlanItem } from '@/features/transformation-plan/plan-item';
import { DEMO_STREAK_DAYS } from '@/features/transformation-plan/transformation-plan-constants';
import { MOCK_PLAN_GOALS } from '@/features/transformation-plan/transformation-plan-mock';
import type { DynamisGoal } from '@/types/energeia';

const DEMO_BRANCH_COUNT = 4;

function filterGoals(goals: DynamisGoal[], filter: PlanFilterId): DynamisGoal[] {
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

function buildInitialRealizedIds(goals: DynamisGoal[]): Set<string> {
  return new Set(goals.filter((goal) => goal.realized).map((goal) => goal.id));
}

export function TransformationPlanScreen() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<PlanFilterId>('all');
  const [goals, setGoals] = useState<DynamisGoal[]>(MOCK_PLAN_GOALS);
  const [realizedIds, setRealizedIds] = useState<Set<string>>(() =>
    buildInitialRealizedIds(MOCK_PLAN_GOALS),
  );

  const filteredGoals = useMemo(() => filterGoals(goals, activeFilter), [goals, activeFilter]);

  const handleToggleRealized = (goalId: string, realized: boolean) => {
    setRealizedIds((prev) => {
      const next = new Set(prev);
      if (realized) {
        next.add(goalId);
      } else {
        next.delete(goalId);
      }
      return next;
    });

    setGoals((prev) =>
      prev.map((goal) => {
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
      }),
    );
  };

  return (
    <div className="min-h-dvh bg-bg font-body text-ink">
      <header className="border-b border-line-soft bg-white px-6 py-5 md:px-10">
        <BrandMark />
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
        <p className="font-body text-xs font-semibold tracking-[0.18em] text-red uppercase">
          {t('transformationPlan.eyebrow')}
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold text-ink">
          {t('transformationPlan.title')}
        </h1>

        <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:gap-10">
          <aside className="w-full shrink-0 lg:w-[360px]">
            <DynamisTree
              branches={DEMO_BRANCH_COUNT}
              leaves={DEMO_STREAK_DAYS}
              fruits={realizedIds.size}
              streakDays={DEMO_STREAK_DAYS}
            />
          </aside>

          <section className="min-w-0 flex-1">
            <PlanFilter activeFilter={activeFilter} onFilterChange={setActiveFilter} />

            <ul className="mt-5 flex flex-col gap-3">
              {filteredGoals.map((goal) => (
                <li key={goal.id}>
                  <PlanItem goal={goal} onToggleRealized={handleToggleRealized} />
                </li>
              ))}
            </ul>

            {filteredGoals.length === 0 ? (
              <p className="mt-6 font-body text-sm text-ink-2">
                {t('transformationPlan.emptyFilter')}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

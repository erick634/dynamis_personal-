import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/ui/brand-mark';
import { DynamisTree } from '@/features/transformation-plan/dynamis-tree';
import { PlanFilter, type PlanFilterId } from '@/features/transformation-plan/plan-filter';
import { PlanItem } from '@/features/transformation-plan/plan-item';
import { MOCK_PLAN_GOALS } from '@/features/transformation-plan/transformation-plan-mock';
import type { DynamisGoal } from '@/types/energeia';

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

export function TransformationPlanScreen() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<PlanFilterId>('all');
  const [goals, setGoals] = useState<DynamisGoal[]>(MOCK_PLAN_GOALS);

  const filteredGoals = useMemo(() => filterGoals(goals, activeFilter), [goals, activeFilter]);

  const realizedCount = goals.filter((goal) => goal.realized).length;

  const handleToggleRealized = (goalId: string, realized: boolean) => {
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
            <div className="rounded-[20px] border border-line-soft bg-gradient-to-b from-blue-soft to-white p-6 shadow-card">
              <div className="mb-4 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red/15 px-3 py-1.5 font-body text-sm font-semibold text-red-deep">
                  <span aria-hidden>🔥</span>
                  {t('transformationPlan.streak', { days: 12 })}
                </span>
              </div>
              <DynamisTree realizedCount={realizedCount} />
            </div>
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

import { Maximize2, Minimize2, Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LifeAreaAddGoalWizard } from '@/features/intent-profile/life-area-add-goal-wizard';
import { LifeAreaGoalItem } from '@/features/intent-profile/life-area-goal-item';
import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { useLifeAreas } from '@/features/intent-profile/use-life-areas';

const EMPTY_GOALS: LifeAreaUserGoal[] = [];

type LifeAreaGoalsPanelProps = {
  areaId: LifeAreaId;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function LifeAreaGoalsPanel({
  areaId,
  expanded,
  onExpandedChange,
}: LifeAreaGoalsPanelProps) {
  const { t } = useTranslation();
  const goals = useLifeAreaGoals((state) => state.goalsByArea[areaId] ?? EMPTY_GOALS);
  const addGoal = useLifeAreaGoals((state) => state.addGoal);
  const removeGoal = useLifeAreaGoals((state) => state.removeGoal);
  const clearGoalRelations = useLifeAreas((state) => state.clearGoalRelations);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [pendingDeleteGoalId, setPendingDeleteGoalId] = useState<string | null>(null);
  const pendingGoal = goals.find((goal) => goal.id === pendingDeleteGoalId);

  return (
    <section
      className={[
        'rounded-2xl border border-line-soft/80 bg-bg/40 p-5 transition-[grid-column] duration-300',
        expanded ? 'md:col-span-2' : '',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ink">
          <Target className="size-4 text-blue" aria-hidden />
          {t('you.lifeArea.goalsTitle')}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onExpandedChange(!expanded);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 font-body text-xs font-semibold text-ink-2 hover:text-ink"
            aria-expanded={expanded}
          >
            {expanded ? (
              <Minimize2 className="size-3.5" aria-hidden />
            ) : (
              <Maximize2 className="size-3.5" aria-hidden />
            )}
            {expanded ? t('you.lifeArea.goals.collapsePanel') : t('you.lifeArea.goals.expandPanel')}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsWizardOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue px-3 py-1.5 font-body text-xs font-semibold text-white"
          >
            <Plus className="size-3.5" aria-hidden />
            {t('you.lifeArea.goals.addGoal')}
          </button>
        </div>
      </div>

      {goals.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-8 text-center font-body text-sm text-ink-3">
          {t('you.lifeArea.goals.empty')}
        </p>
      ) : (
        <ul className="mt-4 max-h-[14.5rem] list-none space-y-3 overflow-y-auto p-0 pr-1">
          {goals.map((goal) => (
            <LifeAreaGoalItem
              key={goal.id}
              areaId={areaId}
              goal={goal}
              forceOpen={expanded}
              onRequestDeleteGoal={setPendingDeleteGoalId}
            />
          ))}
        </ul>
      )}

      <LifeAreaAddGoalWizard
        open={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
        }}
        onSave={({ title, horizonMonths, priority, tasks }) => {
          addGoal(areaId, title, tasks, horizonMonths, priority);
        }}
      />

      <ConfirmDialog
        open={pendingDeleteGoalId !== null}
        title={t('you.lifeArea.goals.deleteConfirmTitle')}
        description={t('you.lifeArea.goals.deleteConfirmDescription', {
          item: pendingGoal?.title ?? '',
        })}
        confirmLabel={t('you.lifeArea.goals.deleteConfirmAction')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          if (pendingDeleteGoalId) {
            clearGoalRelations(areaId, pendingDeleteGoalId);
            removeGoal(areaId, pendingDeleteGoalId);
          }
          setPendingDeleteGoalId(null);
        }}
        onCancel={() => {
          setPendingDeleteGoalId(null);
        }}
      />
    </section>
  );
}

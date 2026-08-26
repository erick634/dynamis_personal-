import { useTranslation } from 'react-i18next';

import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';

const selectClass =
  'w-full rounded-xl border border-line bg-white px-3 py-2 font-body text-sm outline-none focus:border-blue/50';

type LifeAreaGoalRelationSelectProps = {
  goals: LifeAreaUserGoal[];
  value: string | null;
  onChange: (goalId: string | null) => void;
  id?: string;
};

export function LifeAreaGoalRelationSelect({
  goals,
  value,
  onChange,
  id,
}: LifeAreaGoalRelationSelectProps) {
  const { t } = useTranslation();

  return (
    <label className="block">
      <span className="mb-1 block font-body text-[11px] font-semibold text-ink-3 uppercase">
        {t('you.lifeArea.assets.relatedGoalLabel')}
      </span>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value.trim();
          onChange(next.length > 0 ? next : null);
        }}
        className={selectClass}
        disabled={goals.length === 0}
      >
        <option value="">
          {goals.length === 0
            ? t('you.lifeArea.assets.relatedGoalNoneAvailable')
            : t('you.lifeArea.assets.relatedGoalNone')}
        </option>
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title}
          </option>
        ))}
      </select>
    </label>
  );
}

import { useTranslation } from 'react-i18next';

import { GOAL_PRIORITY_CLASS, goalPriorityLabel } from '@/features/intent-profile/goal-priority';
import type { GoalPriority } from '@/features/intent-profile/life-area-goals-types';
import { GOAL_PRIORITIES } from '@/features/intent-profile/life-area-goals-types';

type GoalPriorityBadgeProps = {
  priority: GoalPriority;
  onCycle?: () => void;
  compact?: boolean;
};

/** Clickable badge that cycles essential → more important → less important. */
export function GoalPriorityBadge({ priority, onCycle, compact = false }: GoalPriorityBadgeProps) {
  const { t } = useTranslation();
  const label = goalPriorityLabel(priority, t);
  const className = [
    'rounded-full font-body font-semibold transition-colors',
    compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
    GOAL_PRIORITY_CLASS[priority],
    onCycle ? 'hover:opacity-90' : '',
  ].join(' ');

  if (!onCycle) {
    return <span className={className}>{label}</span>;
  }

  return (
    <button
      type="button"
      onClick={onCycle}
      className={className}
      title={t('you.lifeArea.goals.priority.cycleHint')}
      aria-label={t('you.lifeArea.goals.priority.cycleAria', { priority: label })}
    >
      {label}
    </button>
  );
}

type GoalPrioritySelectProps = {
  value: GoalPriority;
  onChange: (next: GoalPriority) => void;
};

export function GoalPrioritySelect({ value, onChange }: GoalPrioritySelectProps) {
  const { t } = useTranslation();
  return (
    <label className="block">
      <span className="mb-1 block font-body text-xs font-semibold text-ink-3 uppercase">
        {t('you.lifeArea.goals.priority.label')}
      </span>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value as GoalPriority);
        }}
        className="w-full rounded-xl border border-line bg-white px-3 py-2 font-body text-sm outline-none focus:border-blue/50"
      >
        {GOAL_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {goalPriorityLabel(priority, t)}
          </option>
        ))}
      </select>
    </label>
  );
}

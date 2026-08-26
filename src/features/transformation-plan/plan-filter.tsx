import { useTranslation } from 'react-i18next';

import type { PlanPeriodFilter } from '@/features/transformation-plan/plan-life-area-tasks';

export type PlanFilterId = PlanPeriodFilter;

const FILTERS: PlanFilterId[] = ['all', 'today', 'week', 'month'];

type PlanFilterProps = {
  activeFilter: PlanFilterId;
  onFilterChange: (filter: PlanFilterId) => void;
};

export function PlanFilter({ activeFilter, onFilterChange }: PlanFilterProps) {
  const { t } = useTranslation();

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label={t('transformationPlan.filters.label')}
    >
      {FILTERS.map((filterId) => {
        const isActive = activeFilter === filterId;
        return (
          <button
            key={filterId}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              onFilterChange(filterId);
            }}
            className={[
              'rounded-full px-4 py-2 font-body text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue text-white'
                : 'bg-bg-soft text-ink-2 hover:bg-blue-soft hover:text-ink',
            ].join(' ')}
          >
            {t(`transformationPlan.filters.${filterId}`)}
          </button>
        );
      })}
    </div>
  );
}

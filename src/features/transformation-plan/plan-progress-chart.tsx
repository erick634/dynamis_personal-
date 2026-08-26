import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { LIFE_AREA_DOT_COLOR } from '@/features/intent-profile/life-area-scores';
import type {
  PlanLifeAreaTaskRow,
  PlanPeriodFilter,
} from '@/features/transformation-plan/plan-life-area-tasks';

type PlanProgressChartProps = {
  rows: PlanLifeAreaTaskRow[];
  filter: PlanPeriodFilter;
};

export function PlanProgressChart({ rows, filter }: PlanProgressChartProps) {
  const { t } = useTranslation();
  const titleId = useId();

  const chartRows = rows.filter((row) => row.periodTotal > 0);
  const done = chartRows.reduce((sum, row) => sum + row.periodDone, 0);
  const total = chartRows.reduce((sum, row) => sum + row.periodTotal, 0);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <section
      className="rounded-3xl border border-line-soft/80 bg-white p-5 shadow-soft sm:p-6"
      aria-labelledby={titleId}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2
            id={titleId}
            className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl"
          >
            {t('transformationPlan.chart.title')}
          </h2>
          <p className="mt-1 font-body text-sm text-ink-3">
            {t(`transformationPlan.chart.period.${filter}`)}
          </p>
        </div>
        <p className="font-body text-sm font-semibold text-blue">
          {t('transformationPlan.chart.summary', { done, total })}
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
        <div
          className="relative mx-auto h-28 w-28 shrink-0 sm:mx-0"
          role="img"
          aria-label={t('transformationPlan.chart.ringLabel', { percent })}
        >
          <svg className="h-full w-full -rotate-90" viewBox="0 0 104 104" aria-hidden>
            <circle
              cx="52"
              cy="52"
              r={radius}
              fill="none"
              stroke="var(--bg-deep-cream)"
              strokeWidth="10"
            />
            <circle
              cx="52"
              cy="52"
              r={radius}
              fill="none"
              stroke="var(--blue)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-semibold text-ink">{percent}%</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3 max-h-[9.5rem] overflow-y-auto overscroll-contain pr-1">
          {chartRows.length === 0 ? (
            <p className="font-body text-sm text-ink-3">{t('transformationPlan.chart.empty')}</p>
          ) : (
            chartRows.map((row) => {
              const taskPercent =
                row.periodTotal === 0 ? 0 : Math.round((row.periodDone / row.periodTotal) * 100);
              return (
                <div key={row.id} className="shrink-0">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="block truncate font-body text-xs font-semibold text-ink">
                        {row.taskTitle}
                      </span>
                      <span className="font-body text-[10px] text-ink-3">
                        {t('transformationPlan.lifeAreaTasks.goalMeta', {
                          goal: row.goalTitle,
                          area: t(`you.balanceRadar.areas.${row.areaId}`),
                        })}
                      </span>
                    </div>
                    <span className="shrink-0 font-body text-[11px] text-ink-3">
                      {row.periodDone}/{row.periodTotal}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-deep-cream">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${String(taskPercent)}%`,
                        backgroundColor: LIFE_AREA_DOT_COLOR[row.areaId],
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

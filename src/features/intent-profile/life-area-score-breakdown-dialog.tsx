import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { AreaScoreBreakdown } from '@/features/intent-profile/life-area-goal-progress';

type LifeAreaScoreBreakdownDialogProps = {
  open: boolean;
  score: number;
  accentColor: string;
  breakdown: AreaScoreBreakdown | null;
  onClose: () => void;
};

function formatContribution(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

export function LifeAreaScoreBreakdownDialog({
  open,
  score,
  accentColor,
  breakdown,
  onClose,
}: LifeAreaScoreBreakdownDialogProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const maxPercent = Math.max(1, ...(breakdown?.items.map((item) => item.percent) ?? [1]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="life-area-score-breakdown-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-soft"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              {t('you.lifeArea.scoreBreakdown.eyebrow')}
            </p>
            <h2
              id="life-area-score-breakdown-title"
              className="mt-1 font-display text-xl font-semibold text-ink"
            >
              {t('you.lifeArea.scoreBreakdown.title', { score })}
            </h2>
            <p className="mt-1 font-body text-sm text-ink-2">
              {breakdown
                ? t('you.lifeArea.scoreBreakdown.subtitle')
                : t('you.lifeArea.scoreBreakdown.empty')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-bg-deep-cream hover:text-ink"
            aria-label={t('you.lifeArea.scoreBreakdown.close')}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {breakdown ? (
          <ul className="mt-5 space-y-3">
            {breakdown.items.map((item) => {
              const barWidth = `${String(Math.round((item.percent / maxPercent) * 100))}%`;
              return (
                <li
                  key={item.goalId}
                  className="rounded-xl border border-line-soft/80 bg-bg/40 px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-body text-sm font-semibold leading-snug text-ink">
                      {item.title}
                    </p>
                    <p className="shrink-0 font-body text-sm font-semibold tabular-nums text-ink">
                      {t('you.lifeArea.scoreBreakdown.contribution', {
                        points: formatContribution(item.contribution),
                      })}
                    </p>
                  </div>
                  <p className="mt-1 font-body text-[11px] text-ink-3">
                    {t('you.lifeArea.goals.progressLabel', {
                      percent: item.percent,
                      done: item.completed,
                      total: item.total,
                    })}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-deep-cream">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: barWidth, backgroundColor: accentColor }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  formatDurationMinutes,
  formatTaskSchedule,
  toDateKey,
} from '@/features/intent-profile/format-task-schedule';
import { getGoalOccurrenceProgress } from '@/features/intent-profile/life-area-goal-progress';
import type { GoalRelatedAssets } from '@/features/intent-profile/goal-related-assets';
import { LifeAreaGoalRelatedAssets } from '@/features/intent-profile/life-area-goal-related-assets';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';

type LifeAreaGoalInsightDialogProps = {
  open: boolean;
  goal: LifeAreaUserGoal | null;
  relatedAssets: GoalRelatedAssets;
  accentColor: string;
  onClose: () => void;
};

function buildLastSevenDayBars(goal: LifeAreaUserGoal): number[] {
  const today = new Date();
  const counts: number[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = toDateKey(day);
    const completed = goal.tasks.reduce(
      (sum, task) => sum + (task.completedDates.includes(key) ? 1 : 0),
      0,
    );
    counts.push(completed);
  }
  return counts;
}

export function LifeAreaGoalInsightDialog({
  open,
  goal,
  relatedAssets,
  accentColor,
  onClose,
}: LifeAreaGoalInsightDialogProps) {
  const { t } = useTranslation();

  if (!open || !goal) return null;

  const progress = getGoalOccurrenceProgress(goal);
  const bars = buildLastSevenDayBars(goal);
  const maxBar = Math.max(1, ...bars);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress.percent / 100) * circumference;
  const todayKey = toDateKey();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-soft"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              {t('you.lifeArea.growing.insightEyebrow')}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-ink">{goal.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-3 hover:text-ink"
            aria-label={t('common.cancel')}
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-3 font-display text-base text-ink-2 italic">
          {t('you.lifeArea.growing.progressPraise')}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-6">
          <div
            className="relative h-24 w-24 shrink-0"
            role="img"
            aria-label={t('you.lifeArea.goals.progressLabel', {
              percent: progress.percent,
              done: progress.completed,
              total: progress.total,
            })}
          >
            <svg className="h-full w-full -rotate-90" viewBox="0 0 96 96" aria-hidden>
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="var(--bg-deep-cream)"
                strokeWidth="8"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke={accentColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-semibold tabular-nums text-ink">
              {progress.percent}%
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-body text-xs font-semibold text-ink-3 uppercase">
              {t('you.lifeArea.growing.weekChart')}
            </p>
            <div className="mt-2 flex h-20 items-end gap-1.5" aria-hidden>
              {bars.map((value, index) => (
                <div
                  key={`bar-${String(index)}`}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${String(Math.max(8, (value / maxBar) * 64))}px`,
                      backgroundColor: accentColor,
                      opacity: value > 0 ? 1 : 0.25,
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-1 font-body text-[11px] text-ink-3">
              {t('you.lifeArea.goals.progressLabel', {
                percent: progress.percent,
                done: progress.completed,
                total: progress.total,
              })}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="font-body text-xs font-semibold text-ink-3 uppercase">
            {t('you.lifeArea.growing.relatedTasks')}
          </p>
          <ul className="mt-2 list-none space-y-2 p-0">
            {goal.tasks.map((task) => {
              const doneToday = task.completedDates.includes(todayKey);
              const durationLabel = formatDurationMinutes(task.durationMinutes, t);
              return (
                <li
                  key={task.id}
                  className="flex items-start gap-3 rounded-xl border border-line-soft bg-bg/40 px-3 py-2.5"
                >
                  <span
                    className={[
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
                      doneToday
                        ? 'border-blue bg-blue text-white'
                        : 'border-line bg-white text-transparent',
                    ].join(' ')}
                    aria-hidden
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-body text-sm font-medium text-ink">{task.title}</p>
                    <p className="mt-0.5 font-body text-[11px] text-ink-3">
                      {formatTaskSchedule(task.schedule, t)}
                      {durationLabel ? ` · ${durationLabel}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <LifeAreaGoalRelatedAssets assets={relatedAssets} />

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-blue px-4 py-2 font-body text-sm font-semibold text-white"
          >
            {t('you.lifeArea.growing.closeInsight')}
          </button>
        </div>
      </div>
    </div>
  );
}

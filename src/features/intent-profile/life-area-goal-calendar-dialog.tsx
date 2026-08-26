import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  addMonths,
  buildMonthGrid,
  buildWeekDays,
  listOccurrencesForRange,
  occurrencesByDate,
  startOfMonth,
  startOfWeekSunday,
} from '@/features/intent-profile/life-area-goal-calendar';
import { LifeAreaGoalCalendarDayList } from '@/features/intent-profile/life-area-goal-calendar-day-list';
import { toDateKey } from '@/features/intent-profile/format-task-schedule';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';

type CalendarView = 'week' | 'month';

type LifeAreaGoalCalendarDialogProps = {
  open: boolean;
  goal: LifeAreaUserGoal;
  onClose: () => void;
  onSkipDate: (taskId: string, dateKey: string) => void;
  onRestoreDate: (taskId: string, dateKey: string) => void;
  onToggleComplete: (taskId: string, dateKey: string) => void;
  onEditTask: (taskId: string) => void;
};

function formatRangeLabel(view: CalendarView, anchor: Date, locale: string): string {
  if (view === 'week') {
    const start = startOfWeekSunday(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  }
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(anchor);
}

export function LifeAreaGoalCalendarDialog({
  open,
  goal,
  onClose,
  onSkipDate,
  onRestoreDate,
  onToggleComplete,
  onEditTask,
}: LifeAreaGoalCalendarDialogProps) {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<CalendarView>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey());

  const days = useMemo(
    () => (view === 'week' ? buildWeekDays(anchor) : buildMonthGrid(anchor)),
    [anchor, view],
  );

  const byDate = useMemo(() => {
    const rangeStart = days[0] ?? new Date();
    const rangeEnd = days[days.length - 1] ?? new Date();
    const list = listOccurrencesForRange(goal, rangeStart, rangeEnd);
    return occurrencesByDate(list);
  }, [days, goal]);

  const selected = byDate.get(selectedDateKey) ?? [];
  const todayKey = toDateKey();
  const currentMonth = startOfMonth(anchor).getMonth();

  if (!open) return null;

  const shift = (direction: -1 | 1) => {
    if (view === 'week') {
      const next = new Date(anchor);
      next.setDate(next.getDate() + direction * 7);
      setAnchor(next);
      return;
    }
    setAnchor(addMonths(anchor, direction));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div className="min-w-0">
            <p className="font-body text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              {t('you.lifeArea.goals.calendar.eyebrow')}
            </p>
            <h2 className="mt-1 truncate font-display text-xl font-semibold text-ink">
              {goal.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-3 hover:text-ink"
            aria-label={t('common.cancel')}
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex gap-2">
            {(['week', 'month'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setView(option);
                }}
                className={[
                  'rounded-full px-3 py-1.5 font-body text-xs font-semibold',
                  view === option ? 'bg-blue text-white' : 'border border-line bg-white text-ink-2',
                ].join(' ')}
              >
                {t(`you.lifeArea.goals.calendar.view.${option}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                shift(-1);
              }}
              className="rounded-full border border-line p-1.5 text-ink-2 hover:text-ink"
              aria-label={t('you.lifeArea.goals.calendar.prev')}
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[9rem] text-center font-body text-xs font-semibold text-ink">
              {formatRangeLabel(view, anchor, i18n.language)}
            </span>
            <button
              type="button"
              onClick={() => {
                shift(1);
              }}
              className="rounded-full border border-line p-1.5 text-ink-2 hover:text-ink"
              aria-label={t('you.lifeArea.goals.calendar.next')}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <div className="grid grid-cols-7 gap-1">
            {days.slice(0, 7).map((day) => (
              <div
                key={`label-${toDateKey(day)}`}
                className="pb-1 text-center font-body text-[10px] font-semibold tracking-wide text-ink-3 uppercase"
              >
                {new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' }).format(day)}
              </div>
            ))}
            {days.map((day) => {
              const key = toDateKey(day);
              const count = byDate.get(key)?.length ?? 0;
              const isSelected = key === selectedDateKey;
              const isToday = key === todayKey;
              const outsideMonth = view === 'month' && day.getMonth() !== currentMonth;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(key);
                  }}
                  className={[
                    'flex min-h-14 flex-col items-center rounded-xl border px-1 py-1.5 transition-colors',
                    isSelected
                      ? 'border-blue bg-blue-soft/50'
                      : 'border-transparent hover:bg-bg/80',
                    outsideMonth ? 'opacity-40' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex size-6 items-center justify-center rounded-full font-body text-xs font-semibold',
                      isToday ? 'bg-blue text-white' : 'text-ink',
                    ].join(' ')}
                  >
                    {day.getDate()}
                  </span>
                  {count > 0 ? (
                    <span className="mt-1 font-body text-[10px] font-semibold text-blue">
                      {t('you.lifeArea.goals.calendar.taskCount', { count })}
                    </span>
                  ) : (
                    <span className="mt-1 h-3" />
                  )}
                </button>
              );
            })}
          </div>

          <LifeAreaGoalCalendarDayList
            dateKey={selectedDateKey}
            items={selected}
            locale={i18n.language}
            onSkipDate={onSkipDate}
            onRestoreDate={onRestoreDate}
            onToggleComplete={onToggleComplete}
            onEditTask={onEditTask}
          />
        </div>
      </div>
    </div>
  );
}

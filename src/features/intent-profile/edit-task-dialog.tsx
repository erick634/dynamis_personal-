import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GoalPrioritySelect } from '@/features/intent-profile/goal-priority-control';
import { GoalTaskScheduleFields } from '@/features/intent-profile/goal-task-schedule-fields';
import type {
  GoalPriority,
  GoalTaskInput,
  LifeAreaGoalTask,
  TaskCadence,
  TaskSchedule,
  Weekday,
} from '@/features/intent-profile/life-area-goals-types';
import { DEFAULT_GOAL_PRIORITY } from '@/features/intent-profile/life-area-goals-types';

const inputClass =
  'w-full rounded-xl border border-line bg-white px-3 py-2 font-body text-sm outline-none focus:border-blue/50';

type EditTaskDialogProps = {
  open: boolean;
  task: LifeAreaGoalTask | null;
  mode: 'edit' | 'add';
  onClose: () => void;
  onSave: (payload: GoalTaskInput) => void;
};

function scheduleToForm(schedule: TaskSchedule): {
  cadence: TaskCadence;
  weekday: Weekday;
  dayOfMonth: number;
  timeEnabled: boolean;
  time: string;
  includeWeekends: boolean;
} {
  if (schedule.cadence === 'daily') {
    return {
      cadence: 'daily',
      weekday: 1,
      dayOfMonth: 1,
      timeEnabled: Boolean(schedule.time),
      time: schedule.time ?? '09:00',
      includeWeekends: schedule.includeWeekends,
    };
  }
  if (schedule.cadence === 'weekly') {
    return {
      cadence: 'weekly',
      weekday: schedule.weekday,
      dayOfMonth: 1,
      timeEnabled: Boolean(schedule.time),
      time: schedule.time ?? '09:00',
      includeWeekends: false,
    };
  }
  return {
    cadence: 'monthly',
    weekday: 1,
    dayOfMonth: schedule.dayOfMonth,
    timeEnabled: Boolean(schedule.time),
    time: schedule.time ?? '09:00',
    includeWeekends: false,
  };
}

export function EditTaskDialog({ open, task, mode, onClose, onSave }: EditTaskDialogProps) {
  const { t } = useTranslation();
  const initial = task?.schedule ?? {
    cadence: 'daily' as const,
    time: null,
    includeWeekends: false,
  };
  const formSeed = scheduleToForm(initial);
  const [title, setTitle] = useState(task?.title ?? '');
  const [priority, setPriority] = useState<GoalPriority>(task?.priority ?? DEFAULT_GOAL_PRIORITY);
  const [cadence, setCadence] = useState<TaskCadence>(formSeed.cadence);
  const [weekday, setWeekday] = useState<Weekday>(formSeed.weekday);
  const [dayOfMonth, setDayOfMonth] = useState(formSeed.dayOfMonth);
  const [timeEnabled, setTimeEnabled] = useState(formSeed.timeEnabled);
  const [time, setTime] = useState(formSeed.time);
  const [includeWeekends, setIncludeWeekends] = useState(formSeed.includeWeekends);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(
    task?.durationMinutes ?? 30,
  );
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const buildSchedule = (): TaskSchedule => {
    const resolvedTime = timeEnabled ? time : null;
    if (cadence === 'daily') {
      return { cadence: 'daily', time: resolvedTime, includeWeekends };
    }
    if (cadence === 'weekly') return { cadence: 'weekly', weekday, time: resolvedTime };
    return { cadence: 'monthly', dayOfMonth, time: resolvedTime };
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-soft"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2 className="font-display text-xl font-semibold text-ink">
          {mode === 'add'
            ? t('you.lifeArea.goals.edit.addTaskTitle')
            : t('you.lifeArea.goals.edit.editTaskTitle')}
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block font-body text-xs font-semibold text-ink-3 uppercase">
              {t('you.lifeArea.goals.wizard.taskTitleLabel')}
            </span>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              className={inputClass}
              placeholder={t('you.lifeArea.goals.wizard.taskTitlePlaceholder')}
            />
          </label>
          <GoalPrioritySelect value={priority} onChange={setPriority} />
          <GoalTaskScheduleFields
            cadence={cadence}
            onCadenceChange={setCadence}
            weekday={weekday}
            onWeekdayChange={setWeekday}
            dayOfMonth={dayOfMonth}
            onDayOfMonthChange={setDayOfMonth}
            timeEnabled={timeEnabled}
            onTimeEnabledChange={setTimeEnabled}
            time={time}
            onTimeChange={setTime}
            includeWeekends={includeWeekends}
            onIncludeWeekendsChange={setIncludeWeekends}
            durationMinutes={durationMinutes}
            onDurationMinutesChange={setDurationMinutes}
          />
          {error ? (
            <p className="font-body text-xs text-ember" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-4 py-2 font-body text-sm font-medium text-ink"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!title.trim()) {
                  setError(t('you.lifeArea.goals.wizard.taskTitleRequired'));
                  return;
                }
                onSave({
                  title: title.trim(),
                  schedule: buildSchedule(),
                  durationMinutes,
                  priority,
                });
                onClose();
              }}
              className="rounded-full bg-blue px-4 py-2 font-body text-sm font-semibold text-white"
            >
              {t('you.lifeArea.goals.edit.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

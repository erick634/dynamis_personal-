import { Plus, X } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GoalPrioritySelect } from '@/features/intent-profile/goal-priority-control';
import { GoalTaskScheduleFields } from '@/features/intent-profile/goal-task-schedule-fields';
import { LifeAreaGoalDraftTaskList } from '@/features/intent-profile/life-area-goal-draft-list';
import type {
  GoalDraftTask,
  GoalHorizonMonths,
  GoalPriority,
  GoalTaskInput,
  TaskCadence,
  TaskSchedule,
  Weekday,
} from '@/features/intent-profile/life-area-goals-types';
import {
  DEFAULT_GOAL_PRIORITY,
  GOAL_HORIZON_MONTHS,
} from '@/features/intent-profile/life-area-goals-types';

const inputClass =
  'w-full rounded-xl border border-line bg-white px-3 py-2 font-body text-sm outline-none focus:border-blue/50';

type LifeAreaAddGoalWizardProps = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    horizonMonths: GoalHorizonMonths;
    priority: GoalPriority;
    tasks: GoalTaskInput[];
  }) => void;
};

type WizardStep = 'goal' | 'tasks';

export function LifeAreaAddGoalWizard({ open, onClose, onSave }: LifeAreaAddGoalWizardProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const [step, setStep] = useState<WizardStep>('goal');
  const [goalTitle, setGoalTitle] = useState('');
  const [horizonMonths, setHorizonMonths] = useState<GoalHorizonMonths>(3);
  const [goalPriority, setGoalPriority] = useState<GoalPriority>(DEFAULT_GOAL_PRIORITY);
  const [draftTasks, setDraftTasks] = useState<GoalDraftTask[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<GoalPriority>(DEFAULT_GOAL_PRIORITY);
  const [cadence, setCadence] = useState<TaskCadence>('daily');
  const [timeEnabled, setTimeEnabled] = useState(false);
  const [time, setTime] = useState('09:00');
  const [weekday, setWeekday] = useState<Weekday>(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(30);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setStep('goal');
    setGoalTitle('');
    setHorizonMonths(3);
    setGoalPriority(DEFAULT_GOAL_PRIORITY);
    setDraftTasks([]);
    setTaskTitle('');
    setTaskPriority(DEFAULT_GOAL_PRIORITY);
    setCadence('daily');
    setTimeEnabled(false);
    setTime('09:00');
    setWeekday(1);
    setDayOfMonth(1);
    setIncludeWeekends(false);
    setDurationMinutes(30);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const buildSchedule = (): TaskSchedule => {
    const resolvedTime = timeEnabled ? time : null;
    if (cadence === 'daily') {
      return { cadence: 'daily', time: resolvedTime, includeWeekends };
    }
    if (cadence === 'weekly') return { cadence: 'weekly', weekday, time: resolvedTime };
    return { cadence: 'monthly', dayOfMonth, time: resolvedTime };
  };

  const addDraftTask = () => {
    const title = taskTitle.trim();
    if (!title) {
      setError(t('you.lifeArea.goals.wizard.taskTitleRequired'));
      return;
    }
    setDraftTasks((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        title,
        schedule: buildSchedule(),
        durationMinutes,
        priority: taskPriority,
      },
    ]);
    setTaskTitle('');
    setError(null);
  };

  const handleSave = () => {
    if (draftTasks.length === 0) {
      setError(t('you.lifeArea.goals.wizard.tasksRequired'));
      return;
    }
    onSave({
      title: goalTitle.trim(),
      horizonMonths,
      priority: goalPriority,
      tasks: draftTasks.map((task) => ({
        title: task.title,
        schedule: task.schedule,
        durationMinutes: task.durationMinutes,
        priority: task.priority,
      })),
    });
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-soft"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
            {step === 'goal'
              ? t('you.lifeArea.goals.wizard.goalStepTitle')
              : t('you.lifeArea.goals.wizard.tasksStepTitle')}
          </h2>
          <button
            type="button"
            onClick={close}
            className="text-ink-3 hover:text-ink"
            aria-label={t('common.cancel')}
          >
            <X className="size-4" />
          </button>
        </div>

        {step === 'goal' ? (
          <div className="mt-4 space-y-4">
            <p className="font-body text-sm text-ink-2">
              {t('you.lifeArea.goals.wizard.goalStepHint')}
            </p>
            <label className="block">
              <span className="mb-1 block font-body text-xs font-semibold text-ink-3 uppercase">
                {t('you.lifeArea.goals.wizard.finalGoalLabel')}
              </span>
              <input
                value={goalTitle}
                onChange={(event) => {
                  setGoalTitle(event.target.value);
                }}
                className={inputClass}
                placeholder={t('you.lifeArea.goals.wizard.finalGoalPlaceholder')}
              />
            </label>
            <fieldset>
              <legend className="mb-2 font-body text-xs font-semibold text-ink-3 uppercase">
                {t('you.lifeArea.goals.wizard.horizonLabel')}
              </legend>
              <p className="mb-2 font-body text-xs text-ink-3">
                {t('you.lifeArea.goals.wizard.horizonHint')}
              </p>
              <div className="flex flex-wrap gap-2">
                {GOAL_HORIZON_MONTHS.map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => {
                      setHorizonMonths(months);
                    }}
                    className={[
                      'rounded-full px-3 py-1.5 font-body text-xs font-semibold',
                      horizonMonths === months
                        ? 'bg-blue text-white'
                        : 'border border-line bg-white text-ink-2',
                    ].join(' ')}
                  >
                    {t(`you.lifeArea.goals.horizon.${String(months)}`)}
                  </button>
                ))}
              </div>
            </fieldset>
            <GoalPrioritySelect value={goalPriority} onChange={setGoalPriority} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-full border border-line px-4 py-2 font-body text-sm font-medium text-ink"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!goalTitle.trim()) {
                    setError(t('you.lifeArea.goals.wizard.goalTitleRequired'));
                    return;
                  }
                  setError(null);
                  setStep('tasks');
                }}
                className="rounded-full bg-blue px-4 py-2 font-body text-sm font-semibold text-white"
              >
                {t('you.lifeArea.goals.wizard.next')}
              </button>
            </div>
            {error ? (
              <p className="font-body text-xs text-ember" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="font-body text-sm text-ink-2">
              {t('you.lifeArea.goals.wizard.tasksStepHint', { goal: goalTitle.trim() })}
            </p>
            <label className="block">
              <span className="mb-1 block font-body text-xs font-semibold text-ink-3 uppercase">
                {t('you.lifeArea.goals.wizard.taskTitleLabel')}
              </span>
              <input
                value={taskTitle}
                onChange={(event) => {
                  setTaskTitle(event.target.value);
                }}
                className={inputClass}
                placeholder={t('you.lifeArea.goals.wizard.taskTitlePlaceholder')}
              />
            </label>
            <GoalPrioritySelect value={taskPriority} onChange={setTaskPriority} />
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
            <button
              type="button"
              onClick={addDraftTask}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue bg-white px-3 py-1.5 font-body text-xs font-semibold text-blue"
            >
              <Plus className="size-3.5" aria-hidden />
              {t('you.lifeArea.goals.wizard.addTask')}
            </button>
            <LifeAreaGoalDraftTaskList
              tasks={draftTasks}
              onRemove={(localId) => {
                setDraftTasks((prev) => prev.filter((item) => item.localId !== localId));
              }}
            />
            {error ? (
              <p className="font-body text-xs text-ember" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('goal');
                }}
                className="rounded-full border border-line px-4 py-2 font-body text-sm font-medium text-ink"
              >
                {t('you.lifeArea.goals.wizard.back')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full bg-blue px-4 py-2 font-body text-sm font-semibold text-white"
              >
                {t('you.lifeArea.goals.wizard.saveGoal')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';

import { WEEKDAYS } from '@/features/intent-profile/format-task-schedule';
import type { TaskCadence, Weekday } from '@/features/intent-profile/life-area-goals-types';

const inputClass =
  'w-full rounded-xl border border-line bg-white px-3 py-2 font-body text-sm outline-none focus:border-blue/50';

type GoalTaskScheduleFieldsProps = {
  cadence: TaskCadence;
  onCadenceChange: (cadence: TaskCadence) => void;
  weekday: Weekday;
  onWeekdayChange: (weekday: Weekday) => void;
  dayOfMonth: number;
  onDayOfMonthChange: (day: number) => void;
  timeEnabled: boolean;
  onTimeEnabledChange: (enabled: boolean) => void;
  time: string;
  onTimeChange: (time: string) => void;
  includeWeekends: boolean;
  onIncludeWeekendsChange: (include: boolean) => void;
  durationMinutes: number | null;
  onDurationMinutesChange: (minutes: number | null) => void;
};

export function GoalTaskScheduleFields({
  cadence,
  onCadenceChange,
  weekday,
  onWeekdayChange,
  dayOfMonth,
  onDayOfMonthChange,
  timeEnabled,
  onTimeEnabledChange,
  time,
  onTimeChange,
  includeWeekends,
  onIncludeWeekendsChange,
  durationMinutes,
  onDurationMinutesChange,
}: GoalTaskScheduleFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 font-body text-xs font-semibold text-ink-3 uppercase">
          {t('you.lifeArea.goals.wizard.cadenceLabel')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onCadenceChange(option);
              }}
              className={[
                'rounded-full px-3 py-1.5 font-body text-xs font-semibold',
                cadence === option
                  ? 'bg-blue text-white'
                  : 'border border-line bg-white text-ink-2',
              ].join(' ')}
            >
              {t(`you.lifeArea.goals.cadence.${option}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {cadence === 'daily' ? (
        <fieldset>
          <legend className="mb-2 font-body text-xs font-semibold text-ink-3 uppercase">
            {t('you.lifeArea.goals.wizard.weekendsLabel')}
          </legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onIncludeWeekendsChange(false);
              }}
              className={[
                'rounded-full px-3 py-1.5 font-body text-xs font-semibold',
                !includeWeekends ? 'bg-blue text-white' : 'border border-line bg-white text-ink-2',
              ].join(' ')}
            >
              {t('you.lifeArea.goals.wizard.weekdaysOnly')}
            </button>
            <button
              type="button"
              onClick={() => {
                onIncludeWeekendsChange(true);
              }}
              className={[
                'rounded-full px-3 py-1.5 font-body text-xs font-semibold',
                includeWeekends ? 'bg-blue text-white' : 'border border-line bg-white text-ink-2',
              ].join(' ')}
            >
              {t('you.lifeArea.goals.wizard.includeWeekends')}
            </button>
          </div>
        </fieldset>
      ) : null}

      {cadence === 'weekly' ? (
        <label className="block">
          <span className="mb-1 block font-body text-xs font-semibold text-ink-3 uppercase">
            {t('you.lifeArea.goals.wizard.weekdayLabel')}
          </span>
          <select
            value={weekday}
            onChange={(event) => {
              onWeekdayChange(Number(event.target.value) as Weekday);
            }}
            className={inputClass}
          >
            {WEEKDAYS.map((day) => (
              <option key={day} value={day}>
                {t(`you.lifeArea.goals.weekday.${String(day)}`)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {cadence === 'monthly' ? (
        <label className="block">
          <span className="mb-1 block font-body text-xs font-semibold text-ink-3 uppercase">
            {t('you.lifeArea.goals.wizard.dayOfMonthLabel')}
          </span>
          <input
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(event) => {
              const next = Number(event.target.value);
              onDayOfMonthChange(Math.min(31, Math.max(1, next || 1)));
            }}
            className={inputClass}
          />
        </label>
      ) : null}

      <div className="space-y-2">
        <label className="inline-flex items-center gap-2 font-body text-sm text-ink">
          <input
            type="checkbox"
            checked={timeEnabled}
            onChange={(event) => {
              onTimeEnabledChange(event.target.checked);
            }}
          />
          {t('you.lifeArea.goals.wizard.setTime')}
        </label>
        {timeEnabled ? (
          <input
            type="time"
            value={time}
            onChange={(event) => {
              onTimeChange(event.target.value);
            }}
            className={inputClass}
          />
        ) : (
          <p className="font-body text-xs text-ink-3">{t('you.lifeArea.goals.schedule.noTime')}</p>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block font-body text-xs font-semibold text-ink-3 uppercase">
          {t('you.lifeArea.goals.wizard.durationLabel')}
        </span>
        <input
          type="number"
          min={5}
          max={480}
          step={5}
          value={durationMinutes ?? ''}
          placeholder={t('you.lifeArea.goals.wizard.durationPlaceholder')}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (!raw) {
              onDurationMinutesChange(null);
              return;
            }
            const next = Number(raw);
            if (!Number.isInteger(next) || next <= 0) {
              onDurationMinutesChange(null);
              return;
            }
            onDurationMinutesChange(Math.min(480, Math.max(5, next)));
          }}
          className={inputClass}
        />
        <span className="mt-1 block font-body text-[11px] text-ink-3">
          {t('you.lifeArea.goals.wizard.durationHint')}
        </span>
      </label>
    </div>
  );
}

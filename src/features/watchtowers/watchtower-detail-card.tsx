import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  loadWatchtowerReminderPrefs,
  saveWatchtowerReminderPrefs,
} from '@/features/watchtowers/watchtower-reminder-storage';
import { buildWatchtowerSchedule } from '@/features/watchtowers/watchtower-schedule';
import type {
  WatchtowerRecommendation,
  WatchtowerReminderPrefs,
} from '@/features/watchtowers/watchtower-types';

type WatchtowerDetailCardProps = {
  recommendation: WatchtowerRecommendation;
};

function formatScheduleDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function WatchtowerDetailCard({ recommendation }: WatchtowerDetailCardProps) {
  const { t, i18n } = useTranslation();
  const { watchtower_intent_spec: spec } = recommendation;
  const coverageKey =
    recommendation.coverage_type === 'personal'
      ? 'watchtowers.coverage.personal'
      : 'watchtowers.coverage.professional';

  const [prefs, setPrefs] = useState<WatchtowerReminderPrefs>(() =>
    loadWatchtowerReminderPrefs(recommendation.recommendation_id, spec.suggested_reminder_time),
  );

  const schedule = buildWatchtowerSchedule(spec.suggested_frequency);

  function updatePrefs(next: WatchtowerReminderPrefs) {
    setPrefs(next);
    saveWatchtowerReminderPrefs(recommendation.recommendation_id, next);
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-line-soft bg-white/85 shadow-sm">
      <div className="border-b border-line-soft bg-blue/5 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="min-w-0 flex-1 font-display text-2xl font-semibold break-words text-ink">
            {recommendation.display_name}
          </h2>
          <span className="rounded-full border border-line-soft bg-bg px-2.5 py-0.5 font-body text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            {t(coverageKey)}
          </span>
        </div>
        <p className="mt-3 font-body text-base leading-relaxed break-words text-ink">
          {recommendation.user_facing_description}
        </p>
        <p className="mt-4 font-body text-sm leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">{t('watchtowers.objectives.label')}: </span>
          {spec.intent_summary}
        </p>
      </div>

      <section
        className="border-b border-line-soft px-4 py-5 sm:px-6"
        aria-labelledby="wt-calendar"
      >
        <h3 id="wt-calendar" className="font-display text-lg font-semibold text-ink">
          {t('watchtowers.calendar.title')}
        </h3>
        <p className="mt-1 font-body text-sm text-ink-2">
          {t('watchtowers.calendar.cadence', { frequency: spec.suggested_frequency })}
        </p>
        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {schedule.map((date) => (
            <li
              key={date.toISOString()}
              className="rounded-xl border border-line-soft bg-bg px-3 py-3 text-center"
            >
              <p className="font-body text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                {t('watchtowers.calendar.checkIn')}
              </p>
              <p className="mt-1 font-body text-sm font-medium text-ink">
                {formatScheduleDate(date, i18n.language)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-4 py-5 sm:px-6" aria-labelledby="wt-reminders">
        <h3 id="wt-reminders" className="font-display text-lg font-semibold text-ink">
          {t('watchtowers.reminders.title')}
        </h3>
        <p className="mt-1 font-body text-sm text-ink-2">{t('watchtowers.reminders.subtitle')}</p>

        <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-bg px-4 py-3">
          <span className="font-body text-sm font-medium text-ink">
            {t('watchtowers.reminders.reminderToggle')}
          </span>
          <input
            type="checkbox"
            className="size-4 accent-blue"
            checked={prefs.reminderEnabled}
            onChange={(event) => {
              updatePrefs({ ...prefs, reminderEnabled: event.target.checked });
            }}
          />
        </label>

        <label className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-bg px-4 py-3">
          <span className="font-body text-sm font-medium text-ink">
            {t('watchtowers.reminders.alarmToggle')}
          </span>
          <input
            type="checkbox"
            className="size-4 accent-blue"
            checked={prefs.alarmEnabled}
            disabled={!prefs.reminderEnabled}
            onChange={(event) => {
              updatePrefs({ ...prefs, alarmEnabled: event.target.checked });
            }}
          />
        </label>

        <label className="mt-3 block font-body text-sm font-medium text-ink">
          {t('watchtowers.reminders.timeLabel')}
          <input
            type="time"
            value={prefs.reminderTime}
            disabled={!prefs.reminderEnabled}
            onChange={(event) => {
              updatePrefs({ ...prefs, reminderTime: event.target.value || prefs.reminderTime });
            }}
            className="mt-2 w-full rounded-xl border border-line-soft bg-white px-3 py-2 font-body text-base text-ink disabled:opacity-50"
          />
        </label>

        {prefs.reminderEnabled ? (
          <p className="mt-3 font-body text-sm text-ink-2" role="status">
            {t('watchtowers.reminders.nextHint', {
              time: prefs.reminderTime,
              date: formatScheduleDate(schedule[0] ?? new Date(), i18n.language),
            })}
          </p>
        ) : null}
      </section>

      {spec.signals_of_interest.length > 0 ? (
        <details className="border-t border-line-soft px-4 py-4 sm:px-6">
          <summary className="cursor-pointer font-body text-sm font-medium text-ink-3 hover:text-ink">
            {t('watchtowers.details.toggle')}
          </summary>
          <ul className="mt-3 list-disc space-y-1 pl-5 font-body text-sm text-ink-2">
            {spec.signals_of_interest.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

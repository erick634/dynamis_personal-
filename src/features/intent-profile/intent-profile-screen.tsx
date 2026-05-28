import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { BrandMark } from '@/components/ui/brand-mark';
import { useIntentProfile } from '@/features/you/use-intent-profile';
import { useCurrentUser } from '@/stores/current-user';

function formatDateLabel(isoDate: string | null, locale: string): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function parseSummaryBullets(summary: string | null): string[] {
  if (!summary) return [];
  return summary
    .split('\n')
    .map((line) => line.replace(/^\s*•\s*/, '').trim())
    .filter((line) => line.length > 0);
}

export function IntentProfileScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language || 'en-US';
  const user = useCurrentUser((state) => state.user);
  const { profile, isLoading, error, refetch } = useIntentProfile();

  const renderStateCard = (content: ReactNode) => (
    <div className="min-h-dvh bg-bg font-body text-ink">
      <header className="border-b border-line-soft bg-white px-6 py-5 md:px-10">
        <BrandMark />
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
        <section className="rounded-2xl border border-line-soft bg-white p-8 shadow-card">
          {content}
        </section>
      </div>
    </div>
  );

  if (isLoading) {
    return renderStateCard(<p className="font-body text-sm text-ink-2">{t('you.loading')}</p>);
  }

  if (error) {
    return renderStateCard(
      <>
        <h1 className="font-display text-2xl font-semibold text-ink">{t('you.error.title')}</h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-2">{t('you.error.body')}</p>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-6 py-3 text-sm font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
        >
          {t('you.error.retryButton')}
        </button>
      </>,
    );
  }

  if (!profile) {
    return renderStateCard(
      <>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {t('you.processing.title')}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">
          {t('you.processing.body')}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
          >
            {t('you.processing.refreshButton')}
          </button>
          <button
            type="button"
            onClick={() => {
              navigate(user ? '/live' : '/onboarding');
            }}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-5 py-2.5 text-sm font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
          >
            {t('you.processing.startConversation')}
          </button>
        </div>
      </>,
    );
  }

  const updatedAtLabel = formatDateLabel(profile.updatedAt, locale);
  const summaryBullets = parseSummaryBullets(profile.longTermSummary);
  const hasValues = (profile.valuesList?.length ?? 0) > 0;

  return (
    <div className="min-h-dvh bg-bg font-body text-ink">
      <header className="border-b border-line-soft bg-white px-6 py-5 md:px-10">
        <BrandMark />
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line-soft bg-white p-6 shadow-card md:p-8">
            <h1 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight text-ink">
              {profile.displayName || t('you.fallbackTitle')}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
              <p>{t('you.meta.updatedAt', { date: updatedAtLabel })}</p>
              <p>
                {t('you.meta.messagesAnalyzed', {
                  count: profile.longTermSummaryMsgCount ?? 0,
                })}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-line-soft bg-white p-6 shadow-card md:p-8">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t('you.sections.whoYouAre')}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
              {profile.roleContext || '—'}
            </p>
          </section>

          <section className="rounded-2xl border border-line-soft bg-white p-6 shadow-card md:p-8">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t('you.sections.aspirations')}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
              {profile.aspirations || '—'}
            </p>
          </section>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-line-soft bg-white p-6 shadow-card">
              <h2 className="font-display text-xl font-semibold text-ink">
                {t('you.sections.strengths')}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
                {profile.strengths || '—'}
              </p>
            </article>
            <article className="rounded-2xl border border-line-soft bg-white p-6 shadow-card">
              <h2 className="font-display text-xl font-semibold text-ink">
                {t('you.sections.growthAreas')}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
                {profile.weaknesses || '—'}
              </p>
            </article>
          </section>

          {hasValues ? (
            <section className="rounded-2xl border border-line-soft bg-white p-6 shadow-card md:p-8">
              <h2 className="font-display text-2xl font-semibold text-ink">
                {t('you.sections.values')}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.valuesList?.map((value) => (
                  <span
                    key={value}
                    className="rounded-full bg-blue-soft px-3 py-1.5 text-xs font-semibold tracking-wide text-blue"
                  >
                    {value}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-red/20 bg-red/5 p-6 shadow-card md:p-8">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t('you.sections.activeFocus')}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
              {profile.activeFocus || '—'}
            </p>
          </section>

          <section className="rounded-2xl border border-line-soft bg-white p-6 shadow-card md:p-8">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t('you.sections.synthesis')}
            </h2>
            {summaryBullets.length > 0 ? (
              <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-ink-2">
                {summaryBullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-2">—</p>
            )}
          </section>

          <footer className="rounded-2xl border border-line-soft bg-white p-6 shadow-card md:p-8">
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className="inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
            >
              {t('you.refreshButton')}
            </button>

            {profile.notes ? (
              <div className="mt-5 rounded-xl border border-line-soft bg-bg-soft p-4">
                <p className="text-xs font-semibold tracking-[0.14em] text-ink-3 uppercase">
                  {t('you.sections.guideNotes')}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
                  {profile.notes}
                </p>
              </div>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );
}

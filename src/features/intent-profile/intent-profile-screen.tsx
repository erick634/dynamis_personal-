import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { deriveProfileSignalsFromIntentProfile } from '@/features/discovery/derive-profile-signals';
import { hasProfileFieldContent } from '@/features/intent-profile/has-profile-field-content';
import { ProfileCompletenessCard } from '@/features/intent-profile/profile-completeness-card';
import { ProfileFieldValue } from '@/features/intent-profile/profile-field-value';
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

function ProfilePage({ children }: { children: ReactNode }) {
  return (
    <div className="w-full min-w-0 bg-bg font-body text-ink">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10">
        {children}
      </div>
    </div>
  );
}

function ProfileCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={[
        'w-full min-w-0 rounded-2xl border border-line-soft bg-white p-4 shadow-card sm:p-6 md:p-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  );
}

export function IntentProfileScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language || 'en-US';
  const user = useCurrentUser((state) => state.user);
  const { profile, isLoading, error, refetch } = useIntentProfile();

  const signals = deriveProfileSignalsFromIntentProfile(profile);

  const continueConversation = () => {
    navigate(user ? '/guide' : '/onboarding');
  };

  if (isLoading) {
    return (
      <ProfilePage>
        <ProfileCard>
          <p className="font-body text-sm text-ink-2">{t('you.loading')}</p>
        </ProfileCard>
      </ProfilePage>
    );
  }

  if (error) {
    return (
      <ProfilePage>
        <ProfileCard>
          <h1 className="font-display text-2xl font-semibold break-words text-ink">
            {t('you.error.title')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm break-words text-ink-2">{t('you.error.body')}</p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-6 py-3 text-sm font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
          >
            {t('you.error.retryButton')}
          </button>
        </ProfileCard>
      </ProfilePage>
    );
  }

  if (!profile) {
    return (
      <ProfilePage>
        <ProfileCard>
          <h1 className="font-display text-2xl font-semibold break-words text-ink">
            {t('you.processing.title')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed break-words text-ink-2">
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
              onClick={continueConversation}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-5 py-2.5 text-sm font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
            >
              {t('you.processing.startConversation')}
            </button>
          </div>
        </ProfileCard>
      </ProfilePage>
    );
  }

  const updatedAtLabel = formatDateLabel(profile.updatedAt, locale);
  const summaryBullets = parseSummaryBullets(profile.longTermSummary);
  const hasValues = (profile.valuesList?.length ?? 0) > 0;

  return (
    <ProfilePage>
      <div className="space-y-4 sm:space-y-6">
        <ProfileCard>
          <h1 className="font-display text-[clamp(1.5rem,4vw,2.5rem)] font-semibold leading-tight break-words text-ink">
            {profile.displayName || t('you.fallbackTitle')}
          </h1>
          <div className="mt-3 flex flex-col gap-1 text-sm text-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
            <p className="break-words">{t('you.meta.updatedAt', { date: updatedAtLabel })}</p>
            <p className="break-words">
              {t('you.meta.messagesAnalyzed', {
                count: profile.longTermSummaryMsgCount ?? 0,
              })}
            </p>
          </div>
        </ProfileCard>

        <ProfileCompletenessCard signals={signals} />

        <ProfileCard>
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
            {t('you.sections.whoYouAre')}
          </h2>
          <ProfileFieldValue value={profile.roleContext} onContinue={continueConversation} />
        </ProfileCard>

        <ProfileCard>
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
            {t('you.sections.aspirations')}
          </h2>
          <ProfileFieldValue value={profile.aspirations} onContinue={continueConversation} />
        </ProfileCard>

        <section className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
          <article className="min-w-0 rounded-2xl border border-line-soft bg-white p-4 shadow-card sm:p-6">
            <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
              {t('you.sections.strengths')}
            </h2>
            <ProfileFieldValue value={profile.strengths} onContinue={continueConversation} />
          </article>
          <article className="min-w-0 rounded-2xl border border-line-soft bg-white p-4 shadow-card sm:p-6">
            <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">
              {t('you.sections.growthAreas')}
            </h2>
            <ProfileFieldValue value={profile.weaknesses} onContinue={continueConversation} />
          </article>
        </section>

        {hasValues ? (
          <ProfileCard>
            <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
              {t('you.sections.values')}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.valuesList?.map((value) => (
                <span
                  key={value}
                  className="max-w-full rounded-full bg-blue-soft px-3 py-1.5 text-xs font-semibold tracking-wide break-words text-blue"
                >
                  {value}
                </span>
              ))}
            </div>
          </ProfileCard>
        ) : (
          <ProfileCard>
            <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
              {t('you.sections.values')}
            </h2>
            <ProfileFieldValue value={null} onContinue={continueConversation} />
          </ProfileCard>
        )}

        <ProfileCard className="border-red/20 bg-red/5">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
            {t('you.sections.activeFocus')}
          </h2>
          <ProfileFieldValue value={profile.activeFocus} onContinue={continueConversation} />
        </ProfileCard>

        <ProfileCard>
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
            {t('you.sections.synthesis')}
          </h2>
          {summaryBullets.length > 0 ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed break-words text-ink-2 sm:pl-6">
              {summaryBullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <ProfileFieldValue value={null} onContinue={continueConversation} />
          )}
        </ProfileCard>

        <footer className="w-full min-w-0 rounded-2xl border border-line-soft bg-white p-4 shadow-card sm:p-6 md:p-8">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className="inline-flex max-w-full items-center justify-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
            >
              {t('you.refreshButton')}
            </button>
            <button
              type="button"
              onClick={continueConversation}
              className="inline-flex max-w-full items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-5 py-2.5 text-sm font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
            >
              {t('you.stillWorking.cta')}
            </button>
          </div>

          {hasProfileFieldContent(profile.notes) ? (
            <div className="mt-5 min-w-0 rounded-xl border border-line-soft bg-bg-soft p-4">
              <p className="text-xs font-semibold tracking-[0.14em] text-ink-3 uppercase">
                {t('you.sections.guideNotes')}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">
                {profile.notes}
              </p>
            </div>
          ) : null}
        </footer>
      </div>
    </ProfilePage>
  );
}

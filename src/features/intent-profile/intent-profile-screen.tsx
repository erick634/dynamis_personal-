import { ArrowRight, Flame, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { UnlockLoadingIndicator } from '@/components/ui/unlock-loading-indicator';
import { deriveProfileSignalsFromIntentProfile } from '@/features/discovery/derive-profile-signals';
import { ProfileCompletenessCard } from '@/features/intent-profile/profile-completeness-card';
import { ProfileBalanceRadar } from '@/features/intent-profile/profile-balance-radar';
import { LifeAreaCards } from '@/features/intent-profile/life-area-cards';
import { ProfileFieldValue } from '@/features/intent-profile/profile-field-value';
import { ProfileHeroCard } from '@/features/intent-profile/profile-hero-card';
import { ProfileInsightGrid } from '@/features/intent-profile/profile-insight-grid';
import { ProfileSynthesisCard } from '@/features/intent-profile/profile-synthesis-card';
import { ProfileValuesCard } from '@/features/intent-profile/profile-values-card';
import { useIntentProfile } from '@/features/you/use-intent-profile';
import { useHyperspaceNavigate } from '@/hooks/use-hyperspace-navigate';
import { useCurrentUser } from '@/stores/current-user';

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
      <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-8 sm:px-6 md:px-8 md:py-10">
        {children}
      </div>
    </div>
  );
}

function ProfileCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={[
        'w-full min-w-0 rounded-3xl border border-line-soft/80 bg-white p-5 shadow-soft sm:p-7 md:p-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-[1.35rem] font-semibold tracking-tight text-ink sm:text-2xl">
      {children}
    </h2>
  );
}

const primaryButtonClass =
  'inline-flex max-w-full items-center justify-center gap-2 rounded-xl bg-blue px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-blue-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent';

const secondaryButtonClass =
  'inline-flex max-w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-semibold text-blue transition-colors hover:bg-blue-soft/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent';

export function IntentProfileScreen() {
  const { t } = useTranslation();
  const hyperspaceNavigate = useHyperspaceNavigate();
  const user = useCurrentUser((state) => state.user);
  const { profile, isLoading, error, refetch, isRefreshing } = useIntentProfile();

  const signals = deriveProfileSignalsFromIntentProfile(profile);

  const continueConversation = () => {
    hyperspaceNavigate(user ? '/guide' : '/onboarding');
  };

  if (isLoading) {
    return (
      <ProfilePage>
        <ProfileCard>
          <UnlockLoadingIndicator label={t('you.loading')} />
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
            className={`mt-6 ${primaryButtonClass}`}
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
              className={secondaryButtonClass}
            >
              {t('you.processing.refreshButton')}
            </button>
            <button type="button" onClick={continueConversation} className={primaryButtonClass}>
              {t('you.processing.startConversation')}
            </button>
          </div>
        </ProfileCard>
      </ProfilePage>
    );
  }

  const summaryBullets = parseSummaryBullets(profile.longTermSummary);
  const completenessPercent = Math.round(
    (signals.values + signals.mission + signals.strengths + signals.constraints) / 4,
  );

  return (
    <ProfilePage>
      <div className="space-y-5 sm:space-y-6">
        <ProfileHeroCard
          completenessPercent={completenessPercent}
          updatedAtIso={profile.updatedAt}
          messagesAnalyzed={profile.longTermSummaryMsgCount ?? 0}
          isRefreshing={isRefreshing}
          onRefresh={() => {
            void refetch();
          }}
        />

        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2 lg:items-stretch">
          <ProfileCompletenessCard signals={signals} />
          <ProfileBalanceRadar professionalScore={completenessPercent} />
        </div>

        <LifeAreaCards professionalScore={completenessPercent} />
        <ProfileInsightGrid
          roleContext={profile.roleContext}
          aspirations={profile.aspirations}
          strengths={profile.strengths}
          weaknesses={profile.weaknesses}
          onContinue={continueConversation}
        />

        <ProfileValuesCard values={profile.valuesList ?? []} onContinue={continueConversation} />

        <section className="min-w-0 rounded-3xl border border-ember/25 bg-ember-soft/40 p-5 shadow-soft sm:p-7 md:p-8">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ember-soft text-ember"
              aria-hidden
            >
              <Flame className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <SectionHeading>{t('you.sections.activeFocus')}</SectionHeading>
          </div>
          <ProfileFieldValue value={profile.activeFocus} onContinue={continueConversation} />
        </section>

        <ProfileSynthesisCard bullets={summaryBullets} onContinue={continueConversation} />

        <footer className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5">
          <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-line-soft/80 bg-white p-3 shadow-soft sm:p-4">
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              disabled={isRefreshing}
              className={secondaryButtonClass}
            >
              <RefreshCw
                className={['h-4 w-4', isRefreshing ? 'animate-spin' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden
              />
              {t('you.hero.refreshAnalysis')}
            </button>
            <button type="button" onClick={continueConversation} className={primaryButtonClass}>
              {t('you.footer.continueUnlocking')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <aside className="min-w-0 flex-1 rounded-2xl bg-bg-deep-cream/80 px-4 py-4 sm:px-5">
            <p className="font-body text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
              {t('you.footer.guideNoteLabel')}
            </p>
            <p className="mt-2 font-body text-sm leading-relaxed text-ink-2">
              {t('you.footer.guideNoteBody')}
            </p>
          </aside>
        </footer>
      </div>
    </ProfilePage>
  );
}

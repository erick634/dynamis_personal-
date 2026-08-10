import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { UnlockLoadingIndicator } from '@/components/ui/unlock-loading-indicator';
import { fetchWatchtowerRecommendations } from '@/features/watchtowers/watchtower-api';
import { WatchtowerDetailCard } from '@/features/watchtowers/watchtower-detail-card';
import { useCurrentUser } from '@/stores/current-user';

function GuideCta({ bodyKey, ctaKey }: { bodyKey: string; ctaKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="mt-6 rounded-2xl border border-line-soft bg-white/70 p-5">
      <p className="font-body text-sm leading-relaxed text-ink-2">{t(bodyKey)}</p>
      <Link
        to="/guide"
        className="mt-4 inline-flex items-center justify-center rounded-full bg-blue px-5 py-2.5 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        {t(ctaKey)}
      </Link>
    </div>
  );
}

export function WatchtowersScreen() {
  const { t } = useTranslation();
  const userId = useCurrentUser((state) => state.user?.userId);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['watchtower-recommendations', userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('userId is required');
      }
      return fetchWatchtowerRecommendations(userId);
    },
    enabled: Boolean(userId),
    staleTime: Infinity,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const recommendation = data?.recommendations[0] ?? null;
  const isInsufficient = data?.reason === 'insufficient_profile';
  const isEmpty = Boolean(userId) && !isLoading && !isError && !recommendation;
  const isRefreshing = isFetching && !isLoading;

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-6 sm:px-6 md:max-w-2xl md:px-8 md:py-8">
      <header className="w-full min-w-0 max-w-xl">
        <p className="font-body text-[11px] font-semibold tracking-[0.18em] text-blue uppercase">
          {t('watchtowers.eyebrow')}
        </p>
        <h1 className="mt-3 font-display text-3xl leading-tight font-semibold break-words text-ink md:text-4xl">
          {t('watchtowers.title')}
        </h1>
        <p className="mt-3 font-body text-base leading-relaxed text-ink-2">
          {t('watchtowers.subtitle')}
        </p>
      </header>

      {!userId ? (
        <GuideCta bodyKey="watchtowers.noUser.body" ctaKey="watchtowers.noUser.cta" />
      ) : null}

      {userId && isLoading ? (
        <UnlockLoadingIndicator label={t('watchtowers.generating')} className="mt-8" />
      ) : null}

      {userId && isError ? (
        <div className="mt-8 rounded-2xl border border-red/30 bg-white/70 p-5" role="alert">
          <p className="font-body text-sm font-semibold text-red">{t('watchtowers.error.title')}</p>
          <p className="mt-2 font-body text-sm text-ink-2">
            {error instanceof Error ? error.message : t('watchtowers.error.fallback')}
          </p>
        </div>
      ) : null}

      {isEmpty && isInsufficient ? (
        <GuideCta
          bodyKey="watchtowers.insufficientProfile.body"
          ctaKey="watchtowers.insufficientProfile.cta"
        />
      ) : null}

      {isEmpty && !isInsufficient ? (
        <GuideCta bodyKey="watchtowers.empty.body" ctaKey="watchtowers.empty.cta" />
      ) : null}

      {recommendation ? (
        <>
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              disabled={isRefreshing}
              className="rounded-full border border-line px-4 py-2 font-body text-sm font-medium text-ink-2 transition-colors hover:border-blue/40 hover:text-blue disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing ? t('watchtowers.refreshing') : t('watchtowers.refresh')}
            </button>
          </div>
          <div className="mt-4">
            <WatchtowerDetailCard
              key={recommendation.recommendation_id}
              recommendation={recommendation}
            />
          </div>
          <div className="mt-8 rounded-2xl border border-line-soft bg-white/70 p-5">
            <p className="font-body text-sm leading-relaxed text-ink-2">
              {t('watchtowers.continueConversation.body')}
            </p>
            <Link
              to="/guide"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-blue px-5 py-2.5 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('watchtowers.continueConversation.cta')}
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

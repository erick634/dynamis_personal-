import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/ui/brand-mark';
import { MOCK_INTENT_PROFILE } from '@/features/intent-profile/intent-profile-mock';
import { ProfileAttributeCard } from '@/features/intent-profile/profile-attribute-card';
import { ProfileMissionCard } from '@/features/intent-profile/profile-mission-card';
import { useDemoUserId } from '@/hooks/use-demo-user-id';
import { DEFAULT_LOCALE } from '@/lib/i18n';
import { getIntentProfile } from '@/services/intent-profile.service';

function formatRelativeUpdatedAt(isoDate: string, locale: string): string {
  const updated = new Date(isoDate).getTime();
  const diffMinutes = Math.round((Date.now() - updated) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return rtf.format(-diffMinutes, 'minute');
}

export function IntentProfileScreen() {
  const { t, i18n } = useTranslation();
  const userId = useDemoUserId();
  const locale = i18n.language || DEFAULT_LOCALE;

  const { data: profile = MOCK_INTENT_PROFILE } = useQuery({
    queryKey: ['intent-profile', userId],
    queryFn: () => getIntentProfile(userId),
  });

  const confidencePercent = Math.round(profile.confidence * 100);
  const lastUpdatedLabel = formatRelativeUpdatedAt(profile.updatedAt, locale);

  const topValue = profile.values[0] ?? '—';
  const coreStrength = profile.strengths[0] ?? '—';
  const patternToWatch = profile.patternsToWatch[0] ?? '—';

  return (
    <div className="min-h-dvh bg-bg font-body text-ink">
      <header className="border-b border-line-soft bg-white px-6 py-5 md:px-10">
        <BrandMark />
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="font-body text-xs font-semibold tracking-[0.18em] text-blue uppercase">
              {t('intentProfile.eyebrow')}
            </p>
            <h1 className="mt-2 font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight text-ink">
              {t('intentProfile.title')}
            </h1>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 font-body text-sm text-ink-2 md:items-end md:text-right">
            <p className="tabular-nums">
              {t('intentProfile.meta.confidence', { percent: confidencePercent })}
            </p>
            <p>{t('intentProfile.meta.lastUpdated', { relativeTime: lastUpdatedLabel })}</p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2">
            <ProfileMissionCard mission={profile.mission} valueTags={profile.values} />
          </div>

          <ProfileAttributeCard
            eyebrow={t('intentProfile.attributes.topValue.eyebrow')}
            title={topValue}
            description={t('intentProfile.attributes.topValue.description')}
          />

          <ProfileAttributeCard
            eyebrow={t('intentProfile.attributes.coreStrength.eyebrow')}
            title={coreStrength}
            description={t('intentProfile.attributes.coreStrength.description')}
          />

          <ProfileAttributeCard
            eyebrow={t('intentProfile.attributes.patternToWatch.eyebrow')}
            title={patternToWatch}
            description={t('intentProfile.attributes.patternToWatch.description')}
          />

          <ProfileAttributeCard
            eyebrow={t('intentProfile.attributes.vision.eyebrow')}
            title={profile.vision}
            description={t('intentProfile.attributes.vision.description')}
          />
        </div>
      </div>
    </div>
  );
}

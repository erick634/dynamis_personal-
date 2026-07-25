import { Lock, Mountain, Rocket, Sparkles, UserRound, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { hasProfileFieldContent } from '@/features/intent-profile/has-profile-field-content';

import '@/features/intent-profile/profile-insight-grid.css';

type InsightTone = 'identity' | 'aspirations' | 'strengths' | 'growth';

type ProfileInsightGridProps = {
  roleContext: string | null;
  aspirations: string | null;
  strengths: string | null;
  weaknesses: string | null;
  onContinue: () => void;
};

const TONE_ICON: Record<InsightTone, LucideIcon> = {
  identity: UserRound,
  aspirations: Rocket,
  strengths: Sparkles,
  growth: Mountain,
};

function parseStrengthTags(value: string | null): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(/[\n•;]|,(?=\s*[A-Za-zÀ-ÿ])/)
    .map((part) => part.replace(/^\s*[-–—]\s*/, '').trim())
    .filter((part) => part.length > 0);
}

function InsightCard({
  tone,
  title,
  accentBorder = false,
  children,
}: {
  tone: InsightTone;
  title: string;
  accentBorder?: boolean;
  children: ReactNode;
}) {
  const Icon = TONE_ICON[tone];

  return (
    <article
      className={[
        'profile-insight-card',
        `profile-insight-card--${tone}`,
        accentBorder ? 'profile-insight-card--accent' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center gap-3">
        <span className="profile-insight-card__icon" aria-hidden>
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <h3 className="font-display text-xl font-semibold tracking-tight text-ink">{title}</h3>
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </article>
  );
}

function TextBody({ value }: { value: string }) {
  return (
    <p className="whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-ink-2">
      {value}
    </p>
  );
}

function EmptyGrowthState({ onContinue }: { onContinue: () => void }) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onContinue}
      className="profile-insight-card__empty w-full text-left transition-colors hover:bg-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
    >
      <Lock className="mx-auto h-5 w-5 text-ink-3" aria-hidden />
      <p className="mt-3 font-body text-sm font-semibold text-ink">
        {t('you.insights.empty.title')}
      </p>
      <p className="mt-1 font-body text-xs leading-relaxed text-ink-3">
        {t('you.insights.empty.growthBody')}
      </p>
    </button>
  );
}

function ContinuePlaceholder({ onContinue }: { onContinue: () => void }) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onContinue}
      className="w-full rounded-2xl border border-dashed border-line bg-bg-soft/50 px-4 py-3 text-left transition-colors hover:border-blue/35 hover:bg-blue-soft/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
    >
      <span className="block font-body text-sm text-ink-2">{t('you.stillWorking.message')}</span>
      <span className="mt-1 block font-body text-sm font-semibold text-blue">
        {t('you.stillWorking.cta')}
      </span>
    </button>
  );
}

export function ProfileInsightGrid({
  roleContext,
  aspirations,
  strengths,
  weaknesses,
  onContinue,
}: ProfileInsightGridProps) {
  const { t } = useTranslation();
  const strengthTags = parseStrengthTags(strengths);

  return (
    <section
      className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2"
      aria-label={t('you.insights.sectionLabel')}
    >
      <InsightCard tone="identity" title={t('you.sections.whoYouAre')}>
        {hasProfileFieldContent(roleContext) && roleContext ? (
          <TextBody value={roleContext} />
        ) : (
          <ContinuePlaceholder onContinue={onContinue} />
        )}
      </InsightCard>

      <InsightCard tone="aspirations" title={t('you.sections.aspirations')} accentBorder>
        {hasProfileFieldContent(aspirations) && aspirations ? (
          <TextBody value={aspirations} />
        ) : (
          <ContinuePlaceholder onContinue={onContinue} />
        )}
      </InsightCard>

      <InsightCard tone="strengths" title={t('you.sections.strengths')}>
        {strengthTags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {strengthTags.map((tag) => (
              <li key={tag} className="profile-insight-card__tag">
                {tag}
              </li>
            ))}
          </ul>
        ) : hasProfileFieldContent(strengths) && strengths ? (
          <TextBody value={strengths} />
        ) : (
          <ContinuePlaceholder onContinue={onContinue} />
        )}
      </InsightCard>

      <InsightCard tone="growth" title={t('you.sections.growthAreas')}>
        {hasProfileFieldContent(weaknesses) && weaknesses ? (
          <TextBody value={weaknesses} />
        ) : (
          <EmptyGrowthState onContinue={onContinue} />
        )}
      </InsightCard>
    </section>
  );
}

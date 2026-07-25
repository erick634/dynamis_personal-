import { BookOpen, Folder, Heart, Sparkles, Target, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import '@/features/intent-profile/profile-values-card.css';

type ProfileValuesCardProps = {
  values: string[];
  onContinue: () => void;
};

const FALLBACK_ICONS: LucideIcon[] = [Heart, BookOpen, Folder, Target, Sparkles];

function iconForValue(value: string, index: number): LucideIcon {
  const normalized = value.toLowerCase();

  if (
    /help|care|other|pessoa|ajud|empat|compassion|amor|love|heart|comunidad|community/.test(
      normalized,
    )
  ) {
    return Heart;
  }
  if (
    /learn|develop|growth|estud|aprend|book|educ|conhecimento|knowledge|personal/.test(normalized)
  ) {
    return BookOpen;
  }
  if (/organiz|order|folder|sistem|structure|planej|plan/.test(normalized)) {
    return Folder;
  }
  if (/problem|solve|real|impact|goal|target|resolv|desafio|challenge|miss[aã]o/.test(normalized)) {
    return Target;
  }

  return FALLBACK_ICONS[index % FALLBACK_ICONS.length] ?? Heart;
}

export function ProfileValuesCard({ values, onContinue }: ProfileValuesCardProps) {
  const { t } = useTranslation();

  if (values.length === 0) {
    return (
      <section className="profile-values-card">
        <div className="flex items-center gap-3">
          <span className="profile-values-card__mark" aria-hidden>
            <Heart className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {t('you.sections.values')}
          </h2>
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="mt-4 w-full rounded-2xl border border-dashed border-line bg-bg-soft/50 px-4 py-3 text-left transition-colors hover:border-blue/35 hover:bg-blue-soft/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
        >
          <span className="block font-body text-sm text-ink-2">
            {t('you.stillWorking.message')}
          </span>
          <span className="mt-1 block font-body text-sm font-semibold text-blue">
            {t('you.stillWorking.cta')}
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="profile-values-card" aria-labelledby="profile-values-heading">
      <div className="flex items-center gap-3">
        <span className="profile-values-card__mark" aria-hidden>
          <Heart className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <h2
          id="profile-values-heading"
          className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl"
        >
          {t('you.sections.values')}
        </h2>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2.5">
        {values.map((value, index) => {
          const Icon = iconForValue(value, index);
          return (
            <li key={value} className="profile-values-card__pill">
              <Icon
                className={[
                  'profile-values-card__pill-icon',
                  Icon === Heart ? 'profile-values-card__pill-icon--heart' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden
                strokeWidth={2}
              />
              <span>{value}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

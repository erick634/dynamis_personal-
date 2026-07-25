import { Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { BrandIcon } from '@/components/ui/brand-icon';
import { ProfileFieldValue } from '@/features/intent-profile/profile-field-value';

import '@/features/intent-profile/profile-synthesis-card.css';

type ProfileSynthesisCardProps = {
  bullets: string[];
  onContinue: () => void;
};

export function ProfileSynthesisCard({ bullets, onContinue }: ProfileSynthesisCardProps) {
  const { t } = useTranslation();

  return (
    <section className="profile-synthesis-card" aria-labelledby="profile-synthesis-heading">
      <div className="profile-synthesis-card__content min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className="profile-synthesis-card__mark" aria-hidden>
            <Sparkles className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <h2
            id="profile-synthesis-heading"
            className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl"
          >
            {t('you.sections.synthesis')}
          </h2>
        </div>

        {bullets.length > 0 ? (
          <ul className="mt-5 space-y-3.5">
            {bullets.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="profile-synthesis-card__check" aria-hidden>
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1 break-words font-body text-sm leading-relaxed text-ink-2">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ProfileFieldValue value={null} onContinue={onContinue} />
        )}
      </div>

      <div className="profile-synthesis-card__orbit" aria-hidden>
        <span className="profile-synthesis-card__ring profile-synthesis-card__ring--outer" />
        <span className="profile-synthesis-card__ring profile-synthesis-card__ring--mid" />
        <span className="profile-synthesis-card__ring profile-synthesis-card__ring--inner" />
        <span className="profile-synthesis-card__node profile-synthesis-card__node--1" />
        <span className="profile-synthesis-card__node profile-synthesis-card__node--2" />
        <span className="profile-synthesis-card__node profile-synthesis-card__node--3" />
        <span className="profile-synthesis-card__node profile-synthesis-card__node--4" />
        <div className="profile-synthesis-card__orb">
          <BrandIcon className="h-8 w-8 text-blue sm:h-9 sm:w-9" />
        </div>
      </div>
    </section>
  );
}

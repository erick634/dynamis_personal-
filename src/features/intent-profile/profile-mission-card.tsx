import { useTranslation } from 'react-i18next';

type ProfileMissionCardProps = {
  mission: string;
  valueTags: string[];
};

export function ProfileMissionCard({ mission, valueTags }: ProfileMissionCardProps) {
  const { t } = useTranslation();

  return (
    <article className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-bg-deep via-blue to-blue-accent p-8 text-white shadow-elevated lg:min-h-[280px]">
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-deep via-red to-red-warm"
        aria-hidden
      />
      <p className="font-body text-[11px] font-semibold tracking-[0.14em] text-blue-soft uppercase">
        {t('intentProfile.mission.eyebrow')}
      </p>
      <blockquote className="mt-4 font-display text-[clamp(1.35rem,2.5vw,2rem)] leading-snug font-medium text-white">
        {mission}
      </blockquote>
      {valueTags.length > 0 ? (
        <ul className="mt-6 flex flex-wrap gap-2" aria-label={t('intentProfile.mission.tagsLabel')}>
          {valueTags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-red/25 px-3 py-1 font-body text-xs font-semibold text-red-warm ring-1 ring-red-warm/40"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

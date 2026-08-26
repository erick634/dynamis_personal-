import {
  Briefcase,
  ExternalLink,
  FileText,
  Link2,
  MessageCircle,
  Sprout,
  Target,
  Trophy,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandIcon } from '@/components/ui/brand-icon';
import type {
  LifeAreaShareGoal,
  LifeAreaSharePayload,
} from '@/features/share/life-area-share-types';

const AREA_ACCENT: Record<string, string> = {
  professional: '#1c4a7e',
  health: '#2ebc8f',
  studies: '#4f7cff',
  spirituality: '#8b5cf6',
  leisure: '#eab308',
  family: '#ec4899',
  economy: '#14b8a6',
};

function accentForArea(areaId: string): string {
  return AREA_ACCENT[areaId] ?? '#1c4a7e';
}

export function LifeAreaShareShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh w-full bg-bg font-body text-ink">
      <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-8 sm:px-6 md:px-8 md:py-10">
        {children}
        <footer className="mt-10 flex flex-col items-center gap-2 pb-4 text-center">
          <BrandIcon className="h-4 w-4 text-ink-3" />
          <p className="font-body text-xs tracking-wide text-ink-3">{t('share.lifeArea.footer')}</p>
        </footer>
      </div>
    </div>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative h-20 w-20 shrink-0" role="img" aria-label={`${String(score)}%`}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72" aria-hidden>
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--bg-deep-cream)"
          strokeWidth="7"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-semibold tabular-nums text-ink">
        {score}
      </span>
    </div>
  );
}

function GoalCard({ goal, accent }: { goal: LifeAreaShareGoal; accent: string }) {
  return (
    <article className="rounded-xl border border-line-soft/80 bg-white px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-body text-sm font-semibold text-ink">{goal.title}</p>
        {goal.isAchievement ? (
          <Trophy className="size-3.5 shrink-0 text-gold" aria-hidden />
        ) : (
          <Target className="size-3.5 shrink-0 text-ink-3" aria-hidden />
        )}
      </div>
      <p className="mt-1 font-body text-[11px] text-ink-3">
        {`${String(goal.percent)}% · ${String(goal.completed)}/${String(goal.total)}`}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-deep-cream">
        <div
          className="h-full rounded-full"
          style={{ width: `${String(goal.percent)}%`, backgroundColor: accent }}
        />
      </div>
    </article>
  );
}

type LifeAreaShareSuccessProps = {
  data: LifeAreaSharePayload;
  profileCommentsSlot: ReactNode;
  onOpenImage: (imageId: string) => void;
  onOpenDocument: (documentId: string) => void;
};

export function LifeAreaShareSuccess({
  data,
  profileCommentsSlot,
  onOpenImage,
  onOpenDocument,
}: LifeAreaShareSuccessProps) {
  const { t } = useTranslation();
  const accent = accentForArea(data.areaId);
  const achievements = data.goals.filter((goal) => goal.isAchievement);
  const goals = data.goals;

  return (
    <article className="rounded-3xl border border-line-soft/80 bg-white p-5 shadow-soft sm:p-7 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 font-body text-[11px] font-semibold tracking-[0.16em] text-ink-3 uppercase">
            <Briefcase className="size-3.5" style={{ color: accent }} aria-hidden />
            {t('share.lifeArea.eyebrow')}
          </p>
          {data.displayName ? (
            <p className="mt-2 font-body text-sm text-ink-2">{data.displayName}</p>
          ) : null}
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {data.areaLabel}
          </h1>
          {data.summary ? (
            <p className="mt-2 max-w-3xl font-body text-base leading-relaxed text-ink-2">
              {data.summary}
            </p>
          ) : null}
        </div>
        <div className="flex max-w-md items-center gap-3 sm:gap-4">
          {data.motto ? (
            <p className="min-w-0 flex-1 text-right font-display text-sm leading-snug text-ink-2 italic sm:text-[0.95rem]">
              {data.motto}
            </p>
          ) : null}
          <ScoreRing score={data.score} color={accent} />
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-line-soft/80 bg-bg/40 p-5">
          <h2 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ink">
            <Target className="size-4 text-blue" aria-hidden />
            {t('share.lifeArea.goalsTitle')}
          </h2>
          {goals.length === 0 ? (
            <p className="mt-4 font-body text-sm text-ink-3">{t('share.lifeArea.goalsEmpty')}</p>
          ) : (
            <ul className="mt-4 max-h-[18rem] space-y-2 overflow-y-auto">
              {goals.map((goal) => (
                <li key={goal.title}>
                  <GoalCard goal={goal} accent={accent} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line-soft/80 bg-bg/40 p-5">
          <h2 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ink">
            <Sprout className="size-4 text-success-deep" aria-hidden />
            {t('share.lifeArea.growingTitle')}
          </h2>
          {achievements.length === 0 && goals.length === 0 ? (
            <p className="mt-4 font-body text-sm text-ink-3">{t('share.lifeArea.growingEmpty')}</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {(achievements.length > 0 ? achievements : goals).map((goal) => (
                <span
                  key={goal.title}
                  className="rounded-full bg-moss-soft px-3 py-1 font-body text-xs font-semibold text-success-deep"
                >
                  {goal.title}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {data.images.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-line-soft/80 bg-bg/40 p-5">
          <h2 className="font-body text-sm font-semibold text-ink">
            {t('share.lifeArea.imagesTitle')}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {data.images.map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() => {
                  onOpenImage(image.id);
                }}
                className="overflow-hidden rounded-2xl border border-line-soft/80 bg-white text-left transition-shadow hover:shadow-soft"
              >
                <img
                  src={image.dataUrl}
                  alt={image.name}
                  className="aspect-square w-full object-cover"
                />
                <span className="block truncate px-2.5 py-2 font-body text-[11px] text-ink-3">
                  {image.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {data.links.length > 0 || data.documents.length > 0 ? (
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.links.length > 0 ? (
            <div className="rounded-2xl border border-line-soft/80 bg-bg/40 p-5">
              <h2 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ink">
                <Link2 className="size-4 text-blue" aria-hidden />
                {t('share.lifeArea.linksTitle')}
              </h2>
              <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
                {data.links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 font-body text-xs font-semibold text-ink-2 hover:text-blue"
                    >
                      {link.label}
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.documents.length > 0 ? (
            <div className="rounded-2xl border border-line-soft/80 bg-bg/40 p-5">
              <h2 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ink">
                <FileText className="size-4 text-blue" aria-hidden />
                {t('share.lifeArea.documentsTitle')}
              </h2>
              <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
                {data.documents.map((doc) => (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDocument(doc.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 font-body text-xs font-semibold text-ink-2 hover:text-blue"
                    >
                      {doc.name}
                      <MessageCircle className="size-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-line-soft/80 bg-bg/40 p-5">
        <h2 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ink">
          <MessageCircle className="size-4 text-blue" aria-hidden />
          {t('share.lifeArea.comments.profileTitle')}
        </h2>
        <div className="mt-4">{profileCommentsSlot}</div>
      </section>
    </article>
  );
}

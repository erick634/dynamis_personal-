import { Flame, Sprout } from 'lucide-react';

import type { GamificationTrail } from '@/features/today/today-gamification-mock';

type TrailRowProps = {
  trail: GamificationTrail;
};

const TONE_STYLES = {
  moss: {
    box: 'bg-moss-soft',
    icon: 'text-moss',
    bar: 'bg-moss',
  },
  ember: {
    box: 'bg-ember-soft',
    icon: 'text-ember',
    bar: 'bg-ember',
  },
} as const;

export function TrailRow({ trail }: TrailRowProps) {
  const tone = TONE_STYLES[trail.tone];
  const TrailIcon = trail.tone === 'moss' ? Sprout : Flame;

  return (
    <article className="rounded-xl border border-line-soft bg-paper-2 p-3">
      <div className="flex items-center gap-2.5">
        <div
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            tone.box,
          ].join(' ')}
        >
          <TrailIcon className={['h-4 w-4', tone.icon].join(' ')} aria-hidden />
        </div>
        <p className="min-w-0 flex-1 font-display text-sm font-semibold text-ink">{trail.name}</p>
        <p className="font-display text-sm font-semibold text-ink-3 italic">{trail.pct}%</p>
      </div>
      <div
        className="mt-2.5 h-1 overflow-hidden rounded-full bg-bg-deep-cream"
        role="progressbar"
        aria-valuenow={trail.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={trail.name}
      >
        <div
          className={['h-full rounded-full', tone.bar].join(' ')}
          style={{ width: `${String(trail.pct)}%` }}
        />
      </div>
    </article>
  );
}

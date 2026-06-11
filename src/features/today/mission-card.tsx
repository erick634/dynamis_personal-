import { Check, Feather, Headphones } from 'lucide-react';

import type { GamificationMission } from '@/features/today/today-gamification-mock';

type MissionCardProps = {
  mission: GamificationMission;
  index: number;
};

export function MissionCard({ mission, index }: MissionCardProps) {
  const isDone = mission.status === 'done';
  const progressPct =
    mission.target > 0 ? Math.min(100, (mission.current / mission.target) * 100) : 0;
  const MissionIcon = index % 2 === 0 ? Headphones : Feather;

  return (
    <article
      className={[
        'flex gap-3 rounded-2xl border border-line-soft bg-paper p-4 shadow-card',
        isDone ? 'opacity-80' : '',
      ].join(' ')}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-soft">
        {isDone ? (
          <Check className="h-4 w-4 text-blue" aria-hidden />
        ) : (
          <MissionIcon className="h-4 w-4 text-blue-accent" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={[
            'font-display text-[15px] font-semibold leading-snug text-ink',
            isDone ? 'text-ink-3 line-through' : '',
          ].join(' ')}
        >
          {mission.title}
        </p>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg-deep-cream">
          <div
            className="h-full rounded-full bg-blue"
            style={{ width: `${String(progressPct)}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="font-body text-xs text-ink-3">
            {mission.current}/{mission.target}
          </p>
          <p className="font-display text-sm font-semibold text-blue italic">+{mission.xp} XP</p>
        </div>
      </div>
    </article>
  );
}

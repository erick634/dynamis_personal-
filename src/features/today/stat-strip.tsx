import { Flame, Star } from 'lucide-react';

type StatStripProps = {
  streakDays: number;
  level: number;
};

export function StatStrip({ streakDays, level }: StatStripProps) {
  return (
    <div className="flex gap-3">
      <article className="flex flex-1 items-center gap-2.5 rounded-xl border border-line-soft bg-paper-2 px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ember-soft">
          <Flame className="h-4 w-4 text-ember" aria-hidden />
        </div>
        <div>
          <p className="font-display text-xl font-semibold tabular-nums leading-none text-ink">
            {streakDays}
          </p>
          <p className="mt-0.5 font-body text-[10px] text-ink-3">Day streak</p>
        </div>
      </article>

      <article className="flex flex-1 items-center gap-2.5 rounded-xl border border-line-soft bg-paper-2 px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-soft">
          <Star className="h-4 w-4 text-blue-accent" aria-hidden />
        </div>
        <div>
          <p className="font-display text-xl font-semibold tabular-nums leading-none text-ink">
            {level}
          </p>
          <p className="mt-0.5 font-body text-[10px] text-ink-3">Level</p>
        </div>
      </article>
    </div>
  );
}

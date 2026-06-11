type XpCardProps = {
  xpCurrent: number;
  xpToNext: number;
};

export function XpCard({ xpCurrent, xpToNext }: XpCardProps) {
  const pct = xpToNext > 0 ? Math.min(100, (xpCurrent / xpToNext) * 100) : 0;

  return (
    <article className="rounded-2xl border border-line-soft bg-paper-2 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-body text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
          Progress
        </p>
        <p className="font-display text-sm font-semibold tabular-nums text-ink">
          {xpCurrent}
          <span className="text-ink-3"> / {xpToNext} XP</span>
        </p>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-deep-cream"
        role="progressbar"
        aria-valuenow={xpCurrent}
        aria-valuemin={0}
        aria-valuemax={xpToNext}
        aria-label="XP progress"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue to-blue-accent"
          style={{ width: `${String(pct)}%` }}
        />
      </div>
    </article>
  );
}

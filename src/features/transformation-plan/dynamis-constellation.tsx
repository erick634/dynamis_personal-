import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import '@/features/transformation-plan/transformation-plan.css';

export type GoalState = {
  id: string;
  realized: boolean;
};

export type DynamisConstellationProps = {
  goals: GoalState[];
  streakDays: number;
  className?: string;
};

const VIEW_SIZE = 320;

/** Canonical 5-goal journey path (corner-to-corner zig-zag). */
const JOURNEY_PATH_FIVE = [
  { x: 70, y: 90 },
  { x: 140, y: 60 },
  { x: 220, y: 110 },
  { x: 180, y: 200 },
  { x: 90, y: 240 },
] as const;

/** Extended path for up to 10 goals. */
const JOURNEY_PATH_TEN = [
  { x: 55, y: 75 },
  { x: 70, y: 90 },
  { x: 140, y: 60 },
  { x: 220, y: 110 },
  { x: 250, y: 155 },
  { x: 180, y: 200 },
  { x: 90, y: 240 },
  { x: 115, y: 268 },
  { x: 205, y: 258 },
  { x: 268, y: 175 },
] as const;

const PENDING_STROKE = '#94a3b8';
const PENDING_FILL = 'rgba(148, 163, 184, 0.35)';
const LINE_PENDING = '#cbd5e1';
const LINE_TRAVELED = 'rgba(220, 38, 38, 0.4)';

type AmbientStar = {
  x: number;
  y: number;
  r: number;
  opacity: number;
  glow?: boolean;
};

/** Fixed decorative background stars (deterministic — no Math.random). */
const AMBIENT_STARS: AmbientStar[] = [
  { x: 22, y: 26, r: 0.7, opacity: 0.35 },
  { x: 48, y: 44, r: 1.2, opacity: 0.55, glow: true },
  { x: 78, y: 18, r: 0.6, opacity: 0.4 },
  { x: 112, y: 32, r: 0.9, opacity: 0.45 },
  { x: 148, y: 22, r: 0.5, opacity: 0.32 },
  { x: 188, y: 38, r: 1.1, opacity: 0.5, glow: true },
  { x: 228, y: 24, r: 0.7, opacity: 0.38 },
  { x: 268, y: 42, r: 0.8, opacity: 0.42 },
  { x: 298, y: 68, r: 0.6, opacity: 0.35 },
  { x: 16, y: 72, r: 0.9, opacity: 0.48 },
  { x: 38, y: 108, r: 0.5, opacity: 0.3 },
  { x: 62, y: 148, r: 1.0, opacity: 0.52, glow: true },
  { x: 28, y: 188, r: 0.7, opacity: 0.4 },
  { x: 52, y: 228, r: 0.6, opacity: 0.36 },
  { x: 98, y: 268, r: 0.8, opacity: 0.44 },
  { x: 132, y: 288, r: 0.5, opacity: 0.33 },
  { x: 168, y: 302, r: 0.9, opacity: 0.5 },
  { x: 208, y: 292, r: 0.7, opacity: 0.41 },
  { x: 252, y: 278, r: 1.1, opacity: 0.56, glow: true },
  { x: 288, y: 248, r: 0.6, opacity: 0.37 },
  { x: 302, y: 198, r: 0.8, opacity: 0.43 },
  { x: 276, y: 152, r: 0.5, opacity: 0.31 },
  { x: 248, y: 118, r: 0.7, opacity: 0.39 },
  { x: 198, y: 78, r: 0.9, opacity: 0.46 },
  { x: 158, y: 118, r: 0.6, opacity: 0.34 },
  { x: 118, y: 158, r: 1.0, opacity: 0.53, glow: true },
  { x: 88, y: 198, r: 0.5, opacity: 0.3 },
  { x: 128, y: 48, r: 0.7, opacity: 0.4 },
  { x: 168, y: 168, r: 0.8, opacity: 0.45 },
  { x: 238, y: 188, r: 0.6, opacity: 0.36 },
  { x: 278, y: 98, r: 0.9, opacity: 0.49, glow: true },
  { x: 32, y: 258, r: 0.7, opacity: 0.38 },
  { x: 108, y: 88, r: 0.5, opacity: 0.32 },
  { x: 188, y: 248, r: 0.8, opacity: 0.44 },
  { x: 258, y: 58, r: 1.2, opacity: 0.58, glow: true },
  { x: 72, y: 128, r: 0.6, opacity: 0.35 },
  { x: 218, y: 148, r: 0.7, opacity: 0.42 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateAlongPath(
  path: ReadonlyArray<{ x: number; y: number }>,
  t: number,
): { x: number; y: number } {
  if (path.length === 0) {
    return { x: VIEW_SIZE / 2, y: VIEW_SIZE / 2 };
  }
  if (path.length === 1) {
    return path[0] ?? { x: VIEW_SIZE / 2, y: VIEW_SIZE / 2 };
  }

  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (path.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;
  const from = path[index];
  const to = path[Math.min(index + 1, path.length - 1)];
  if (!from || !to) {
    return { x: VIEW_SIZE / 2, y: VIEW_SIZE / 2 };
  }

  return {
    x: lerp(from.x, to.x, fraction),
    y: lerp(from.y, to.y, fraction),
  };
}

function computeStarPositions(count: number): { x: number; y: number }[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [{ x: VIEW_SIZE / 2, y: VIEW_SIZE / 2 }];
  }

  const path = count <= 5 ? JOURNEY_PATH_FIVE : JOURNEY_PATH_TEN;
  const positions: { x: number; y: number }[] = [];
  for (let index = 0; index < count; index += 1) {
    positions.push(interpolateAlongPath(path, index / (count - 1)));
  }
  return positions;
}

function getLineStyle(
  fromRealized: boolean,
  toRealized: boolean,
): { stroke: string; strokeOpacity: number } {
  if (fromRealized && toRealized) {
    return { stroke: LINE_TRAVELED, strokeOpacity: 1 };
  }
  return { stroke: LINE_PENDING, strokeOpacity: 0.4 };
}

export function DynamisConstellation({
  goals,
  streakDays,
  className = '',
}: DynamisConstellationProps) {
  const { t } = useTranslation();
  const prevRealizedRef = useRef<Set<string> | null>(null);

  const positions = useMemo(() => computeStarPositions(goals.length), [goals.length]);

  const realizedCount = goals.filter((goal) => goal.realized).length;

  const newlyRealizedIds = useMemo(() => {
    if (prevRealizedRef.current === null) {
      return new Set<string>();
    }
    const next = new Set<string>();
    for (const goal of goals) {
      if (goal.realized && !prevRealizedRef.current.has(goal.id)) {
        next.add(goal.id);
      }
    }
    return next;
  }, [goals]);

  useEffect(() => {
    prevRealizedRef.current = new Set(goals.filter((goal) => goal.realized).map((goal) => goal.id));
  }, [goals]);

  const haloOpacity = Math.min(streakDays / 30, 1) * 0.25;

  const ariaLabel = t('transformationPlan.constellation.ariaLabel', {
    count: goals.length,
    realized: realizedCount,
  });

  return (
    <div
      className={`dynamis-plan-constellation-card relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-3xl pb-2 pt-6 shadow-lg ${className}`}
    >
      <div className="dynamis-streak-pill font-display text-base font-bold">
        <span aria-hidden="true">🔥</span>
        <span className="tabular-nums">
          {t('transformationPlan.tree.streakPill', { count: streakDays })}
        </span>
      </div>

      <div className="dynamis-plan-constellation__sky relative z-0 mt-16 w-full">
        <svg
          className="relative z-10 h-[240px] w-[240px] md:h-[320px] md:w-[320px]"
          viewBox={`0 0 ${String(VIEW_SIZE)} ${String(VIEW_SIZE)}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <radialGradient id="dynamis-plan-radial-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--red)" stopOpacity={haloOpacity} />
              <stop offset="70%" stopColor="var(--red)" stopOpacity={haloOpacity * 0.35} />
              <stop offset="100%" stopColor="var(--red)" stopOpacity="0" />
            </radialGradient>
            <filter id="dynamis-plan-ambient-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="dynamis-plan-node-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="dynamis-plan-strong-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {AMBIENT_STARS.map((star, index) => (
            <circle
              key={`ambient-${String(index)}`}
              cx={star.x}
              cy={star.y}
              r={star.r}
              fill="white"
              fillOpacity={star.opacity}
              filter={star.glow ? 'url(#dynamis-plan-ambient-glow)' : undefined}
              aria-hidden
            />
          ))}

          <circle
            cx={VIEW_SIZE / 2}
            cy={VIEW_SIZE / 2}
            r={140}
            fill="url(#dynamis-plan-radial-glow)"
            aria-hidden
          />

          {goals.map((goal, index) => {
            const next = goals[index + 1];
            const from = positions[index];
            const to = positions[index + 1];
            if (!from || !to || !next) {
              return null;
            }

            const lineStyle = getLineStyle(goal.realized, next.realized);
            return (
              <line
                key={`edge-${goal.id}-${next.id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={lineStyle.stroke}
                strokeOpacity={lineStyle.strokeOpacity}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}

          {goals.map((goal, index) => {
            const position = positions[index];
            if (!position) {
              return null;
            }

            const isRealized = goal.realized;
            const radius = isRealized ? 6.5 : 4.5;
            const isNewlyRealized = newlyRealizedIds.has(goal.id);

            return (
              <g
                key={goal.id}
                filter={
                  isRealized ? 'url(#dynamis-plan-strong-glow)' : 'url(#dynamis-plan-node-glow)'
                }
                className={[
                  isRealized ? 'dynamis-plan-constellation__pulse' : undefined,
                  isNewlyRealized ? 'dynamis-plan-constellation__realize-enter' : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={isRealized ? { animationDelay: `${String(index * 0.15)}s` } : undefined}
              >
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={radius * 2.2}
                  fill={isRealized ? 'var(--red)' : PENDING_STROKE}
                  fillOpacity={isRealized ? 0.22 : 0.15}
                />
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={radius}
                  fill={isRealized ? 'var(--red)' : PENDING_FILL}
                  stroke={isRealized ? 'var(--red)' : PENDING_STROKE}
                  strokeWidth={isRealized ? 0 : 1}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <p className="sr-only">{ariaLabel}</p>
    </div>
  );
}

import { Check, Lock, Play, Target } from 'lucide-react';

import type { DynamisGoal } from '@/types/energeia';

export type TrailNode = {
  goal: DynamisGoal;
  resolvedTitle: string;
  state: 'done' | 'current' | 'locked';
  tone: 'blue' | 'ember';
};

type PlanTrailMapProps = {
  nodes: TrailNode[];
  onToggleRealized: (goalId: string, realized: boolean) => void;
};

const WIND_OFFSETS = [-28, 28] as const;

function getNodeOffset(index: number): number {
  return WIND_OFFSETS[index % WIND_OFFSETS.length] ?? 0;
}

type TrailNodeItemProps = {
  node: TrailNode;
  index: number;
  onToggleRealized: (goalId: string, realized: boolean) => void;
};

function TrailNodeItem({ node, index, onToggleRealized }: TrailNodeItemProps) {
  const { goal, resolvedTitle, state, tone } = node;
  const offset = getNodeOffset(index);
  const isClickable = state === 'done' || state === 'current';
  const CurrentIcon = tone === 'ember' ? Target : Play;

  const titleClass =
    state === 'locked' ? 'text-ink-3' : state === 'done' ? 'text-ink-2' : 'font-semibold text-ink';

  const handleClick = () => {
    if (state === 'current') {
      onToggleRealized(goal.id, true);
      return;
    }
    if (state === 'done') {
      onToggleRealized(goal.id, false);
    }
  };

  return (
    <li className="relative flex w-full max-w-sm flex-col items-center">
      {index > 0 ? (
        <div
          className="mb-3 h-10 w-px bg-line"
          style={{ transform: `translateX(${String(getNodeOffset(index - 1))}px)` }}
          aria-hidden
        />
      ) : null}

      <div
        className="flex w-full items-center gap-4"
        style={{ transform: `translateX(${String(offset)}px)` }}
      >
        <div className="relative shrink-0">
          {state === 'current' ? (
            <span
              className={[
                'pointer-events-none absolute -inset-1 rounded-full ring-4 animate-pulse',
                tone === 'ember' ? 'ring-ember-soft' : 'ring-blue-soft',
              ].join(' ')}
              aria-hidden
            />
          ) : null}

          {isClickable ? (
            <button
              type="button"
              onClick={handleClick}
              aria-label={`${resolvedTitle} — ${state}`}
              className={[
                'relative flex h-14 w-14 items-center justify-center rounded-full transition-colors',
                state === 'done'
                  ? 'bg-moss text-white'
                  : tone === 'ember'
                    ? 'bg-ember text-white'
                    : 'bg-blue text-white',
              ].join(' ')}
            >
              {state === 'done' ? (
                <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
              ) : (
                <CurrentIcon className="h-5 w-5" aria-hidden />
              )}
            </button>
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-deep-cream text-ink-3 opacity-70"
              aria-label={`${resolvedTitle} — ${state}`}
            >
              <Lock className="h-5 w-5" aria-hidden />
            </div>
          )}
        </div>

        <p className={['min-w-0 flex-1 font-display text-sm leading-snug', titleClass].join(' ')}>
          {resolvedTitle}
        </p>
      </div>
    </li>
  );
}

export function PlanTrailMap({ nodes, onToggleRealized }: PlanTrailMapProps) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <ol className="mt-5 flex flex-col items-center">
      {nodes.map((node, index) => (
        <TrailNodeItem
          key={node.goal.id}
          node={node}
          index={index}
          onToggleRealized={onToggleRealized}
        />
      ))}
    </ol>
  );
}

import { useTranslation } from 'react-i18next';

/**
 * Dynamis Tree — illustrated SVG with semantic growth.
 *
 * Semantics (rule 11):
 * - BRANCH = journey initiated (one per active goal, up to 4)
 * - LEAF   = daily action completed (granular progress, up to 18)
 * - FRUIT  = Energeia realized (potential -> actuality, up to 5)
 *
 * All animations are CSS-only and respect prefers-reduced-motion (rule 20).
 */

const BRANCH_PATHS = [
  { d: 'M170 215 C135 195, 105 175, 75 145', width: 9, hasHighlight: true },
  { d: 'M175 195 C215 170, 240 140, 265 115', width: 9, hasHighlight: true },
  { d: 'M170 170 C150 140, 135 120, 115 95', width: 7, hasHighlight: false },
  { d: 'M175 160 C200 130, 215 110, 230 88', width: 7, hasHighlight: false },
] as const;

type LeafColor = 'light' | 'mid' | 'dark';

const LEAF_SLOTS: ReadonlyArray<{
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
  color: LeafColor;
}> = [
  { x: 85, y: 140, rx: 24, ry: 15, rot: 15, color: 'dark' },
  { x: 65, y: 155, rx: 22, ry: 13, rot: -25, color: 'mid' },
  { x: 100, y: 155, rx: 23, ry: 14, rot: 45, color: 'light' },
  { x: 80, y: 165, rx: 20, ry: 12, rot: 70, color: 'dark' },
  { x: 255, y: 115, rx: 24, ry: 15, rot: -20, color: 'dark' },
  { x: 275, y: 105, rx: 22, ry: 13, rot: 25, color: 'mid' },
  { x: 245, y: 135, rx: 21, ry: 13, rot: 50, color: 'light' },
  { x: 285, y: 125, rx: 20, ry: 12, rot: 80, color: 'dark' },
  { x: 120, y: 90, rx: 23, ry: 14, rot: -10, color: 'mid' },
  { x: 105, y: 105, rx: 20, ry: 12, rot: 30, color: 'light' },
  { x: 135, y: 105, rx: 22, ry: 13, rot: 60, color: 'dark' },
  { x: 225, y: 85, rx: 22, ry: 14, rot: -5, color: 'dark' },
  { x: 245, y: 80, rx: 20, ry: 12, rot: 35, color: 'mid' },
  { x: 215, y: 105, rx: 21, ry: 13, rot: 65, color: 'light' },
  { x: 170, y: 95, rx: 24, ry: 15, rot: 0, color: 'dark' },
  { x: 155, y: 80, rx: 20, ry: 12, rot: -20, color: 'mid' },
  { x: 185, y: 80, rx: 20, ry: 12, rot: 20, color: 'light' },
  { x: 170, y: 115, rx: 19, ry: 11, rot: 50, color: 'dark' },
];

const FRUIT_SLOTS: ReadonlyArray<{ x: number; y: number; r: number }> = [
  { x: 90, y: 125, r: 7.5 },
  { x: 125, y: 100, r: 7.5 },
  { x: 265, y: 125, r: 7.5 },
  { x: 235, y: 90, r: 7 },
  { x: 178, y: 108, r: 6.5 },
];

const LEAF_COLORS: Record<LeafColor, string> = {
  light: '#4FB36B',
  mid: '#6BCB5F',
  dark: '#48A868',
};

const TREE_COLORS = {
  trunkBase: '#8B5A2B',
  trunkShadow: '#6F431F',
  trunkHighlight: '#A66A3F',
  ground: '#DFF2B8',
  groundDeep: '#C5E098',
  rock: '#CBD5E1',
  rockHighlight: '#E2E8F0',
  grass: '#48A868',
  grassLight: '#6BCB5F',
} as const;

export type DynamisTreeProps = {
  /** Number of journeys initiated. 0..4 */
  branches: number;
  /** Number of daily actions completed. 0..18 */
  leaves: number;
  /** Number of Energeia realized (red fruits). 0..5 */
  fruits: number;
  /** Current daily streak shown in the pill. */
  streakDays: number;
  /** Optional className for the outer container. */
  className?: string;
};

export function DynamisTree({
  branches,
  leaves,
  fruits,
  streakDays,
  className = '',
}: DynamisTreeProps) {
  const { t } = useTranslation();

  const visibleBranches = BRANCH_PATHS.slice(
    0,
    Math.max(0, Math.min(branches, BRANCH_PATHS.length)),
  );
  const visibleLeaves = LEAF_SLOTS.slice(0, Math.max(0, Math.min(leaves, LEAF_SLOTS.length)));
  const visibleFruits = FRUIT_SLOTS.slice(0, Math.max(0, Math.min(fruits, FRUIT_SLOTS.length)));

  const ariaLabel = t('transformationPlan.tree.ariaLabel', {
    branches: visibleBranches.length,
    leaves: visibleLeaves.length,
    fruits: visibleFruits.length,
    streakDays,
  });

  return (
    <div
      className={`dynamis-tree-card relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-3xl pb-2 pt-6 shadow-lg ${className}`}
    >
      <div className="dynamis-streak-pill flex items-center gap-2 whitespace-nowrap font-display text-base font-bold text-ink">
        <span aria-hidden="true">🔥</span>
        <span className="tabular-nums">
          {t('transformationPlan.tree.streakPill', { count: streakDays })}
        </span>
      </div>

      <svg viewBox="0 0 340 380" className="mt-16 h-auto w-full" role="img" aria-label={ariaLabel}>
        <defs>
          <radialGradient id="dynamisTreeFruitGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FCA5A5" />
            <stop offset="40%" stopColor="var(--red-warm)" />
            <stop offset="100%" stopColor="var(--red-2)" />
          </radialGradient>
        </defs>

        <g aria-hidden="true">
          <ellipse
            className="dt-falling"
            cx="60"
            cy="-30"
            rx="6"
            ry="3"
            fill={LEAF_COLORS.mid}
            style={{ animationDuration: '11s', animationDelay: '0s' }}
          />
          <ellipse
            className="dt-falling"
            cx="280"
            cy="-30"
            rx="6"
            ry="3"
            fill={LEAF_COLORS.dark}
            style={{ animationDuration: '14s', animationDelay: '3s' }}
          />
          <ellipse
            className="dt-falling"
            cx="140"
            cy="-30"
            rx="5"
            ry="3"
            fill={LEAF_COLORS.mid}
            style={{ animationDuration: '9s', animationDelay: '5s' }}
          />
          <ellipse
            className="dt-falling"
            cx="220"
            cy="-30"
            rx="5"
            ry="3"
            fill={LEAF_COLORS.light}
            style={{ animationDuration: '12s', animationDelay: '1s' }}
          />
          <ellipse
            className="dt-falling"
            cx="310"
            cy="-30"
            rx="6"
            ry="3"
            fill={LEAF_COLORS.dark}
            style={{ animationDuration: '8s', animationDelay: '7s' }}
          />
        </g>

        <g aria-hidden="true">
          <path
            className="dt-sparkle"
            d="M40 160 L42 154 L44 160 L50 162 L44 164 L42 170 L40 164 L34 162 Z"
            fill="#86EFAC"
            style={{ animationDelay: '0s' }}
          />
          <path
            className="dt-sparkle"
            d="M295 130 L297 124 L299 130 L305 132 L299 134 L297 140 L295 134 L289 132 Z"
            fill="#BFDBFE"
            style={{ animationDelay: '1s' }}
          />
          <path
            className="dt-sparkle"
            d="M60 250 L62 244 L64 250 L70 252 L64 254 L62 260 L60 254 L54 252 Z"
            fill="#86EFAC"
            style={{ animationDelay: '2s' }}
          />
          <path
            className="dt-sparkle"
            d="M310 230 L312 224 L314 230 L320 232 L314 234 L312 240 L310 234 L304 232 Z"
            fill="#BFDBFE"
            style={{ animationDelay: '0.5s' }}
          />
        </g>

        <ellipse cx="170" cy="346" rx="115" ry="14" fill="rgba(11,25,41,0.06)" />
        <ellipse cx="170" cy="343" rx="108" ry="18" fill={TREE_COLORS.ground} />
        <ellipse cx="170" cy="343" rx="88" ry="11" fill={TREE_COLORS.groundDeep} opacity="0.7" />

        <path
          d="M165 340 C155 280, 165 215, 170 155 C175 215, 190 270, 185 340 Z"
          fill={TREE_COLORS.trunkBase}
        />
        <path
          d="M170 340 C175 270, 180 200, 173 155 L177 155 C180 200, 188 280, 185 340 Z"
          fill={TREE_COLORS.trunkShadow}
          opacity="0.55"
        />
        <path
          d="M165 340 C158 280, 162 220, 168 155 L171 155 C166 220, 162 280, 168 340 Z"
          fill={TREE_COLORS.trunkHighlight}
          opacity="0.35"
        />

        {visibleBranches.map((branch, i) => (
          <g
            key={`branch-${branch.d}`}
            className="dt-elem-enter"
            style={{ animationDelay: `${String(i * 60)}ms` }}
          >
            <path
              d={branch.d}
              stroke={TREE_COLORS.trunkShadow}
              strokeWidth={branch.width}
              fill="none"
              strokeLinecap="round"
            />
            {branch.hasHighlight ? (
              <path
                d={branch.d}
                stroke={TREE_COLORS.trunkBase}
                strokeWidth={branch.width * 0.3}
                fill="none"
                strokeLinecap="round"
                opacity="0.5"
                transform="translate(0,-3)"
              />
            ) : null}
          </g>
        ))}

        {visibleLeaves.map((leaf, i) => (
          <g
            key={`leaf-${String(leaf.x)}-${String(leaf.y)}`}
            className="dt-elem-enter"
            style={{ animationDelay: `${String(i * 40)}ms` }}
          >
            <g
              className="dt-leaf-sway"
              style={{
                transformOrigin: `${String(leaf.x)}px ${String(leaf.y)}px`,
                animationDuration: `${String(4 + (i % 4))}s`,
                animationDelay: `${String((i * 0.3) % 3)}s`,
              }}
            >
              <ellipse
                cx={leaf.x}
                cy={leaf.y}
                rx={leaf.rx}
                ry={leaf.ry}
                fill={LEAF_COLORS[leaf.color]}
                transform={`rotate(${String(leaf.rot)}, ${String(leaf.x)}, ${String(leaf.y)})`}
              />
            </g>
          </g>
        ))}

        {visibleFruits.map((fruit, i) => (
          <g
            key={`fruit-${String(fruit.x)}-${String(fruit.y)}`}
            className="dt-fruit-enter"
            style={{ animationDelay: `${String(i * 80)}ms` }}
          >
            <g className="dt-fruit-pulse" style={{ animationDelay: `${String(i * 0.5)}s` }}>
              <circle cx={fruit.x} cy={fruit.y} r={fruit.r} fill="url(#dynamisTreeFruitGrad)" />
              <ellipse
                cx={fruit.x - 1.5}
                cy={fruit.y - 2.5}
                rx={fruit.r * 0.3}
                ry={fruit.r * 0.18}
                fill="rgba(255,255,255,0.7)"
              />
            </g>
          </g>
        ))}

        <ellipse cx="120" cy="350" rx="14" ry="6" fill="rgba(11,25,41,0.08)" />
        <ellipse cx="120" cy="347" rx="14" ry="9" fill={TREE_COLORS.rock} />
        <ellipse cx="118" cy="345" rx="11" ry="6" fill={TREE_COLORS.rockHighlight} />
        <ellipse cx="220" cy="352" rx="16" ry="6" fill="rgba(11,25,41,0.08)" />
        <ellipse cx="220" cy="349" rx="16" ry="10" fill={TREE_COLORS.rock} />
        <ellipse cx="218" cy="347" rx="13" ry="7" fill={TREE_COLORS.rockHighlight} />

        <path d="M95 348 C100 325, 110 325, 112 348 Z" fill={TREE_COLORS.grass} />
        <path d="M104 348 L106 332 L108 348 Z" fill={TREE_COLORS.grassLight} />
        <path d="M242 350 C247 327, 257 327, 259 350 Z" fill={TREE_COLORS.grass} />
        <path d="M250 350 L252 333 L254 350 Z" fill={TREE_COLORS.grassLight} />
        <path d="M155 348 C158 334, 165 334, 168 348 Z" fill={TREE_COLORS.grass} />
        <path d="M195 350 C198 336, 205 336, 208 350 Z" fill={TREE_COLORS.grass} />
      </svg>

      <p className="sr-only">{ariaLabel}</p>

      <style>{`
        .dynamis-tree-card {
          background: linear-gradient(180deg, #E0F2FE 0%, var(--color-bg) 100%);
        }
        .dynamis-streak-pill {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.95);
          padding: 8px 20px;
          border-radius: 100px;
          box-shadow: 0 4px 12px rgba(11, 25, 41, 0.08);
          z-index: 10;
        }
        @keyframes dt-leaf-fall {
          0%   { transform: translate(0, -10px) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.5; }
          90%  { opacity: 0.5; }
          100% { transform: translate(20px, 420px) rotate(360deg); opacity: 0; }
        }
        .dt-falling { animation: dt-leaf-fall linear infinite; }
        @keyframes dt-leaf-sway {
          0%, 100% { transform: rotate(-2deg); }
          50%      { transform: rotate(2deg); }
        }
        .dt-leaf-sway { animation: dt-leaf-sway ease-in-out infinite; }
        @keyframes dt-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .dt-elem-enter { animation: dt-fade-in 500ms ease-out both; }
        @keyframes dt-fruit-pop {
          0%   { opacity: 0; transform: scale(0.5); }
          60%  { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        .dt-fruit-enter {
          animation: dt-fruit-pop 450ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes dt-fruit-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.85; }
        }
        .dt-fruit-pulse { animation: dt-fruit-pulse 3s ease-in-out infinite; }
        @keyframes dt-sparkle-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%      { opacity: 1; transform: scale(1.1); }
        }
        .dt-sparkle {
          transform-box: fill-box;
          transform-origin: center;
          animation: dt-sparkle-twinkle 2.5s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .dt-falling,
          .dt-leaf-sway,
          .dt-elem-enter,
          .dt-fruit-enter,
          .dt-fruit-pulse,
          .dt-sparkle {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

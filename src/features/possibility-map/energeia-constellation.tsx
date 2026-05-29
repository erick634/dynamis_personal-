import { useTranslation } from 'react-i18next';

type Node = {
  x: number;
  y: number;
  r: number;
  accent?: boolean;
  pulse?: boolean;
};

const NODES: Node[] = [
  { x: 32, y: 48, r: 2.5 },
  { x: 68, y: 32, r: 2 },
  { x: 104, y: 56, r: 3, accent: true, pulse: true },
  { x: 142, y: 38, r: 2.5 },
  { x: 178, y: 62, r: 2 },
  { x: 214, y: 44, r: 3.5, accent: true },
  { x: 252, y: 72, r: 2.5 },
  { x: 288, y: 52, r: 2 },
  { x: 48, y: 96, r: 2 },
  { x: 86, y: 112, r: 3 },
  { x: 124, y: 94, r: 2.5 },
  { x: 162, y: 118, r: 4, accent: true, pulse: true },
  { x: 200, y: 98, r: 2.5 },
  { x: 238, y: 122, r: 3 },
  { x: 276, y: 104, r: 2 },
  { x: 40, y: 148, r: 2.5 },
  { x: 78, y: 168, r: 3 },
  { x: 116, y: 152, r: 2 },
  { x: 154, y: 176, r: 3.5, accent: true },
  { x: 192, y: 158, r: 2.5 },
  { x: 230, y: 182, r: 3 },
  { x: 268, y: 164, r: 2.5 },
  { x: 56, y: 208, r: 2 },
  { x: 94, y: 228, r: 3 },
  { x: 132, y: 210, r: 2.5 },
  { x: 170, y: 234, r: 4, accent: true, pulse: true },
  { x: 208, y: 216, r: 2.5 },
  { x: 246, y: 240, r: 3 },
  { x: 284, y: 222, r: 2.5 },
  { x: 118, y: 272, r: 2.5 },
  { x: 196, y: 278, r: 3 },
];

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [0, 8],
  [8, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [12, 13],
  [13, 14],
  [8, 15],
  [15, 16],
  [16, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [20, 21],
  [16, 22],
  [22, 23],
  [23, 24],
  [24, 25],
  [25, 26],
  [26, 27],
  [27, 28],
  [24, 29],
  [29, 30],
  [9, 17],
  [11, 19],
  [13, 21],
  [18, 25],
  [2, 10],
  [5, 13],
  [12, 20],
  [17, 24],
  [23, 29],
  [1, 9],
  [4, 12],
  [7, 14],
  [14, 21],
  [21, 28],
  [6, 13],
  [10, 18],
];

type EnergeiaConstellationProps = {
  visibleNodeCount?: number;
  accentNodeCount?: number;
};

export function EnergeiaConstellation({
  visibleNodeCount = NODES.length,
  accentNodeCount = NODES.filter((node) => node.accent).length,
}: EnergeiaConstellationProps) {
  const { t } = useTranslation();
  const maxIndex = Math.min(visibleNodeCount, NODES.length);
  const accentSlots = Math.min(accentNodeCount, maxIndex);
  const visibleNodes = NODES.slice(0, maxIndex).map((node, index) => {
    const isAccent = Boolean(node.accent) && index < accentSlots;
    return {
      ...node,
      accent: isAccent,
      pulse: isAccent && node.pulse,
    };
  });
  const visibleEdges = EDGES.filter(([from, to]) => from < maxIndex && to < maxIndex);

  return (
    <svg
      className="relative z-10 h-[240px] w-[240px] md:h-[320px] md:w-[320px]"
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={t('possibilityMap.energeia.ariaLabel')}
    >
      <defs>
        <radialGradient id="energeia-radial-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--red)" stopOpacity="0.35" />
          <stop offset="70%" stopColor="var(--red)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--red)" stopOpacity="0" />
        </radialGradient>
        <filter id="energeia-node-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="energeia-strong-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="160" cy="160" r="140" fill="url(#energeia-radial-glow)" aria-hidden />

      {visibleEdges.map(([from, to]) => {
        const a = NODES[from];
        const b = NODES[to];
        if (!a || !b) return null;
        return (
          <line
            key={`${String(from)}-${String(to)}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="white"
            strokeOpacity="0.22"
            strokeWidth="1"
          />
        );
      })}

      {visibleNodes.map((node, index) => (
        <g
          key={index}
          filter={node.accent ? 'url(#energeia-strong-glow)' : 'url(#energeia-node-glow)'}
          className={node.pulse ? 'possibility-map__energeia-pulse' : undefined}
          style={node.pulse ? { animationDelay: `${String(index * 0.15)}s` } : undefined}
        >
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r * 2.4}
            fill={node.accent ? 'var(--red)' : 'white'}
            fillOpacity={node.accent ? 0.25 : 0.1}
          />
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill={node.accent ? 'var(--red)' : 'white'}
            fillOpacity={node.accent ? 1 : 0.9}
          />
        </g>
      ))}
    </svg>
  );
}

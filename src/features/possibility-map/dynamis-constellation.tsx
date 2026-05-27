import { useTranslation } from 'react-i18next';

type Node = {
  x: number;
  y: number;
  r: number;
  accent?: boolean;
};

const NODES: Node[] = [
  { x: 48, y: 72, r: 3 },
  { x: 92, y: 48, r: 2.5 },
  { x: 138, y: 86, r: 4, accent: true },
  { x: 186, y: 54, r: 2 },
  { x: 228, y: 98, r: 3.5 },
  { x: 268, y: 64, r: 2.5 },
  { x: 72, y: 132, r: 2 },
  { x: 118, y: 158, r: 5, accent: true },
  { x: 164, y: 128, r: 3 },
  { x: 210, y: 172, r: 2.5 },
  { x: 256, y: 148, r: 3 },
  { x: 98, y: 208, r: 2 },
  { x: 152, y: 232, r: 4, accent: true },
  { x: 204, y: 218, r: 2.5 },
  { x: 248, y: 252, r: 3 },
];

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [2, 7],
  [7, 8],
  [8, 9],
  [0, 6],
  [6, 7],
  [7, 12],
  [12, 13],
  [9, 14],
  [4, 10],
  [10, 9],
  [8, 13],
];

export function DynamisConstellation() {
  const { t } = useTranslation();

  return (
    <svg
      className="h-[240px] w-[240px] md:h-[320px] md:w-[320px]"
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={t('possibilityMap.dynamis.ariaLabel')}
    >
      <defs>
        <filter id="dynamis-blue-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dynamis-soft-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {EDGES.map(([from, to]) => {
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
            strokeOpacity="0.2"
            strokeWidth="1"
          />
        );
      })}

      {NODES.map((node, index) => (
        <g key={index} filter={node.accent ? 'url(#dynamis-blue-glow)' : 'url(#dynamis-soft-glow)'}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r * 2.2}
            fill={node.accent ? 'var(--blue-2)' : 'white'}
            fillOpacity={node.accent ? 0.18 : 0.08}
          />
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill={node.accent ? 'var(--blue-2)' : 'white'}
            fillOpacity={node.accent ? 1 : 0.85}
          />
        </g>
      ))}
    </svg>
  );
}

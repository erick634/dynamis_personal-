const NODES = [
  { x: 40, y: 50 },
  { x: 90, y: 35 },
  { x: 140, y: 55 },
  { x: 200, y: 40 },
  { x: 260, y: 70 },
  { x: 300, y: 110 },
  { x: 70, y: 100 },
  { x: 120, y: 120 },
  { x: 180, y: 95 },
  { x: 240, y: 130 },
  { x: 290, y: 170 },
  { x: 50, y: 170 },
  { x: 110, y: 190 },
  { x: 170, y: 165 },
  { x: 230, y: 200 },
  { x: 280, y: 230 },
  { x: 150, y: 240 },
  { x: 210, y: 260 },
] as const;

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [0, 6],
  [6, 7],
  [7, 8],
  [8, 3],
  [8, 9],
  [9, 10],
  [6, 11],
  [11, 12],
  [12, 13],
  [13, 9],
  [13, 14],
  [14, 15],
  [12, 16],
  [16, 17],
  [14, 17],
  [7, 12],
  [8, 13],
  [4, 9],
  [10, 15],
  [2, 8],
  [11, 7],
];

export function EnergeiaConstellation() {
  return (
    <svg
      className="relative z-10 h-full w-full max-h-[320px]"
      viewBox="0 0 340 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <filter id="energeia-node-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
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
            stroke="var(--red-warm)"
            strokeOpacity="0.55"
            strokeWidth="1.25"
          />
        );
      })}
      {NODES.map((node, index) => (
        <g key={index} filter="url(#energeia-node-glow)">
          <circle cx={node.x} cy={node.y} r="12" fill="var(--red)" fillOpacity="0.2" />
          <circle cx={node.x} cy={node.y} r="6" fill="var(--red-warm)" />
          <circle cx={node.x} cy={node.y} r="2.5" fill="#fff" fillOpacity="0.9" />
        </g>
      ))}
    </svg>
  );
}

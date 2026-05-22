const NODES = [
  { x: 120, y: 60 },
  { x: 200, y: 90 },
  { x: 80, y: 140 },
  { x: 160, y: 170 },
  { x: 240, y: 150 },
  { x: 100, y: 220 },
  { x: 190, y: 250 },
] as const;

const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 4],
  [2, 3],
  [3, 5],
  [3, 6],
  [4, 6],
  [1, 3],
];

export function DynamisConstellation() {
  return (
    <svg
      className="h-full w-full max-h-[320px]"
      viewBox="0 0 320 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
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
            stroke="var(--blue-2)"
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />
        );
      })}
      {NODES.map((node, index) => (
        <g key={index}>
          <circle cx={node.x} cy={node.y} r="10" fill="var(--blue-soft)" fillOpacity="0.25" />
          <circle cx={node.x} cy={node.y} r="5" fill="var(--blue-2)" />
          <circle cx={node.x} cy={node.y} r="2" fill="var(--blue-soft)" />
        </g>
      ))}
    </svg>
  );
}

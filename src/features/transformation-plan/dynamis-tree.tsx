type DynamisTreeProps = {
  realizedCount: number;
};

export function DynamisTree({ realizedCount }: DynamisTreeProps) {
  const growthScale = 0.85 + Math.min(realizedCount, 5) * 0.03;

  return (
    <svg
      viewBox="0 0 280 360"
      className="mx-auto h-full w-full max-h-[320px]"
      style={{ transform: `scale(${String(growthScale)})`, transformOrigin: 'bottom center' }}
      aria-hidden
    >
      <ellipse cx="140" cy="340" rx="90" ry="14" fill="var(--bg-soft)" />

      {/* Trunk */}
      <path
        d="M128 340 Q124 260 132 200 Q138 150 140 110 L148 110 Q150 150 148 200 Q156 260 152 340 Z"
        fill="#6B4F3A"
      />

      {/* Withered branch (inactivity) */}
      <path
        d="M140 180 Q90 150 55 120"
        stroke="#94A3B8"
        strokeWidth="3"
        strokeDasharray="6 5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Main branches */}
      <path
        d="M140 200 Q200 170 230 130"
        stroke="#6B4F3A"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M140 220 Q80 190 45 155"
        stroke="#6B4F3A"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M140 160 Q180 120 210 85"
        stroke="#6B4F3A"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Green foliage clusters */}
      <g fill="var(--success)" opacity="0.9">
        <circle cx="230" cy="125" r="18" />
        <circle cx="248" cy="118" r="14" />
        <circle cx="218" cy="108" r="12" />
        <circle cx="45" cy="150" r="16" />
        <circle cx="62" cy="142" r="13" />
        <circle cx="30" cy="138" r="11" />
        <circle cx="210" cy="82" r="15" />
        <circle cx="195" cy="72" r="12" />
        <circle cx="225" cy="70" r="10" />
        <circle cx="155" cy="95" r="20" />
        <circle cx="140" cy="78" r="16" />
        <circle cx="170" cy="88" r="14" />
      </g>

      {/* Red accent leaves (Energeia — rule 20, no gold) */}
      <g fill="var(--red)">
        <circle cx="248" cy="95" r="7" />
        <circle cx="72" cy="128" r="6" />
        <circle cx="188" cy="62" r="8" />
        <circle cx="162" cy="68" r="5" />
      </g>
      <g fill="var(--red-warm)">
        <circle cx="235" cy="108" r="5" />
        <circle cx="55" cy="155" r="6" />
      </g>
    </svg>
  );
}

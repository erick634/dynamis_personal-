export function AwakeningDoor() {
  return (
    <div className="relative hidden min-h-dvh items-center justify-center lg:flex" aria-hidden>
      <div className="relative h-[min(72vh,640px)] w-[min(38vw,320px)]">
        <div className="absolute -inset-8 rounded-[32px] bg-red/20 blur-3xl" />
        <svg
          className="relative h-full w-full drop-shadow-[0_0_60px_rgb(217_74_56_/_35%)]"
          viewBox="0 0 280 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="24"
            y="16"
            width="232"
            height="488"
            rx="12"
            fill="#0B1929"
            stroke="#C73E2C"
            strokeWidth="2"
          />
          <rect x="40" y="32" width="200" height="456" rx="8" fill="url(#door-panel)" />
          <path d="M140 32 L140 488" stroke="#C73E2C" strokeWidth="1.5" strokeOpacity="0.6" />
          <rect x="118" y="240" width="44" height="8" rx="4" fill="#E8654D" />
          <ellipse cx="200" cy="120" rx="48" ry="120" fill="url(#door-glow)" opacity="0.85" />
          <defs>
            <linearGradient
              id="door-panel"
              x1="40"
              y1="32"
              x2="240"
              y2="488"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#C73E2C" />
              <stop offset="0.45" stopColor="#D94A38" />
              <stop offset="1" stopColor="#E8654D" />
            </linearGradient>
            <radialGradient
              id="door-glow"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(200 120) rotate(90) scale(120 48)"
            >
              <stop stopColor="#E8654D" stopOpacity="0.9" />
              <stop offset="1" stopColor="#D94A38" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

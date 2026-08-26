import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  buildGoalProgressByArea,
  buildLifeAreaScores,
  scoreBand,
  type LifeAreaId,
  type LifeAreaScore,
} from '@/features/intent-profile/life-area-scores';
import { useLifeAreas } from '@/features/intent-profile/use-life-areas';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { useHyperspaceNavigate } from '@/hooks/use-hyperspace-navigate';

type ProfileBalanceRadarProps = {
  /** Overall profile clarity — seeds the Professional axis until life-area Profiles exist. */
  professionalScore: number;
};

const BAND_COLOR = {
  high: 'var(--blue)',
  mid: 'var(--success)',
  low: 'var(--ember)',
} as const;

const CHART_SIZE = 280;
const CENTER = CHART_SIZE / 2;
const MAX_RADIUS = 92;
const LABEL_RADIUS = 118;
const GRID_RINGS = [0.25, 0.5, 0.75, 1] as const;

function polarPoint(index: number, total: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

function polygonPoints(scores: LifeAreaScore[], radiusScale: number): string {
  return scores
    .map((area, index) => {
      const point = polarPoint(index, scores.length, (area.score / 100) * radiusScale);
      return `${String(point.x)},${String(point.y)}`;
    })
    .join(' ');
}

function ringPolygon(total: number, radius: number): string {
  return Array.from({ length: total }, (_, index) => {
    const point = polarPoint(index, total, radius);
    return `${String(point.x)},${String(point.y)}`;
  }).join(' ');
}

export function ProfileBalanceRadar({ professionalScore }: ProfileBalanceRadarProps) {
  const { t, i18n } = useTranslation();
  const [showScores, setShowScores] = useState(false);
  const titleId = useId();
  const hyperspaceNavigate = useHyperspaceNavigate();
  const activeAreaIds = useLifeAreas((state) => state.activeAreaIds);
  const goalsByArea = useLifeAreaGoals((state) => state.goalsByArea);
  const locale = i18n.language || 'en-US';
  const areas = buildLifeAreaScores(
    professionalScore,
    activeAreaIds,
    buildGoalProgressByArea(goalsByArea),
  );
  const total = areas.length;
  const percentFormat = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  });

  const openArea = (id: LifeAreaId) => {
    hyperspaceNavigate(`/you/areas/${id}`);
  };

  return (
    <section
      className="flex w-full min-w-0 flex-col rounded-3xl border border-line-soft/80 bg-paper p-5 shadow-soft sm:p-7 md:p-8"
      aria-labelledby={titleId}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={titleId}
            className="font-display text-[1.35rem] font-semibold tracking-tight text-ink sm:text-2xl"
          >
            {t('you.balanceRadar.title')}
          </h2>
          <p className="mt-1.5 font-body text-sm text-ink-3">{t('you.balanceRadar.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowScores((prev) => !prev);
          }}
          className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 font-body text-xs font-semibold text-blue transition-colors hover:bg-blue-soft/60"
          aria-expanded={showScores}
        >
          {showScores ? t('you.balanceRadar.hideScores') : t('you.balanceRadar.viewScores')}
        </button>
      </header>

      {total === 0 ? (
        <p className="mt-8 text-center font-body text-sm text-ink-3">{t('you.lifeArea.empty')}</p>
      ) : (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center">
          <svg
            viewBox={`0 0 ${String(CHART_SIZE)} ${String(CHART_SIZE)}`}
            className="h-auto w-full max-w-[17.5rem]"
            role="img"
            aria-label={t('you.balanceRadar.chartAria')}
          >
            {GRID_RINGS.map((scale) => (
              <polygon
                key={scale}
                points={ringPolygon(total, MAX_RADIUS * scale)}
                fill="none"
                stroke="var(--line-soft)"
                strokeWidth="1"
              />
            ))}

            {areas.map((area, index) => {
              const tip = polarPoint(index, total, MAX_RADIUS);
              return (
                <line
                  key={`axis-${area.id}`}
                  x1={CENTER}
                  y1={CENTER}
                  x2={tip.x}
                  y2={tip.y}
                  stroke="var(--line-soft)"
                  strokeWidth="1"
                />
              );
            })}

            <polygon
              points={polygonPoints(areas, MAX_RADIUS)}
              fill="color-mix(in srgb, var(--blue) 22%, transparent)"
              stroke="var(--blue)"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {areas.map((area, index) => {
              const point = polarPoint(index, total, (area.score / 100) * MAX_RADIUS);
              const band = scoreBand(area.score);
              const label = polarPoint(index, total, LABEL_RADIUS);
              return (
                <g key={area.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={BAND_COLOR[band]}
                    stroke="var(--paper)"
                    strokeWidth="1.5"
                    className="cursor-pointer"
                    onClick={() => {
                      openArea(area.id);
                    }}
                  />
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-[var(--ink-2)] cursor-pointer font-body text-[10px] font-semibold tracking-wide hover:fill-[var(--blue)]"
                    onClick={() => {
                      openArea(area.id);
                    }}
                  >
                    {t(`you.balanceRadar.areas.${area.id}`)}
                  </text>
                </g>
              );
            })}
          </svg>

          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {(
              [
                ['high', 'you.balanceRadar.bands.high'],
                ['mid', 'you.balanceRadar.bands.mid'],
                ['low', 'you.balanceRadar.bands.low'],
              ] as const
            ).map(([band, labelKey]) => (
              <li
                key={band}
                className="inline-flex items-center gap-1.5 font-body text-[11px] text-ink-3"
              >
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: BAND_COLOR[band] }}
                  aria-hidden
                />
                {t(labelKey)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showScores && total > 0 ? (
        <ul className="mt-6 grid list-none grid-cols-2 gap-2 p-0">
          {areas.map((area) => {
            const band = scoreBand(area.score);
            return (
              <li key={area.id}>
                <button
                  type="button"
                  onClick={() => {
                    openArea(area.id);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-line-soft/80 bg-white px-3 py-2 text-left transition-colors hover:border-blue/35"
                >
                  <span className="inline-flex min-w-0 items-center gap-2 font-body text-sm text-ink">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: BAND_COLOR[band] }}
                      aria-hidden
                    />
                    <span className="truncate">{t(`you.balanceRadar.areas.${area.id}`)}</span>
                  </span>
                  <span className="shrink-0 font-body text-sm font-semibold tabular-nums text-ink">
                    {percentFormat.format(area.score / 100)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

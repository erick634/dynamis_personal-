import { FileText, Image as ImageIcon, Link2, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  buildGoalProgressByArea,
  buildLifeAreaScores,
  LIFE_AREA_DOT_COLOR,
  LIFE_AREA_IDS,
  type LifeAreaId,
} from '@/features/intent-profile/life-area-scores';
import {
  countAreaAssets,
  EMPTY_LIFE_AREA_CONTENT,
  useLifeAreas,
} from '@/features/intent-profile/use-life-areas';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { resolveLifeAreaMotto } from '@/features/intent-profile/resolve-life-area-motto';
import { useHyperspaceNavigate } from '@/hooks/use-hyperspace-navigate';

type LifeAreaCardsProps = {
  professionalScore: number;
};

export function LifeAreaCards({ professionalScore }: LifeAreaCardsProps) {
  const { t } = useTranslation();
  const hyperspaceNavigate = useHyperspaceNavigate();
  const activeAreaIds = useLifeAreas((state) => state.activeAreaIds);
  const contentByArea = useLifeAreas((state) => state.contentByArea);
  const goalsByArea = useLifeAreaGoals((state) => state.goalsByArea);
  const addArea = useLifeAreas((state) => state.addArea);
  const removeArea = useLifeAreas((state) => state.removeArea);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingRemoveAreaId, setPendingRemoveAreaId] = useState<LifeAreaId | null>(null);

  const scores = buildLifeAreaScores(
    professionalScore,
    activeAreaIds,
    buildGoalProgressByArea(goalsByArea),
  );
  const inactiveIds = LIFE_AREA_IDS.filter((id) => !activeAreaIds.includes(id));
  const pendingAreaLabel = pendingRemoveAreaId
    ? t(`you.balanceRadar.areas.${pendingRemoveAreaId}`)
    : '';

  return (
    <section className="w-full min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.35rem] font-semibold tracking-tight text-ink sm:text-2xl">
            {t('you.lifeArea.cardsTitle')}
          </h2>
          <p className="mt-1 font-body text-sm text-ink-3">{t('you.lifeArea.cardsSubtitle')}</p>
        </div>
        {inactiveIds.length > 0 ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsPickerOpen((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 font-body text-xs font-semibold text-blue transition-colors hover:bg-blue-soft/60"
              aria-expanded={isPickerOpen}
            >
              <Plus className="size-3.5" aria-hidden />
              {t('you.lifeArea.addArea')}
            </button>
            {isPickerOpen ? (
              <ul className="absolute right-0 z-20 mt-2 min-w-[12rem] list-none rounded-2xl border border-line-soft bg-white p-2 shadow-card">
                {inactiveIds.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-body text-sm text-ink hover:bg-bg-soft"
                      onClick={() => {
                        addArea(id);
                        setIsPickerOpen(false);
                      }}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: LIFE_AREA_DOT_COLOR[id] }}
                        aria-hidden
                      />
                      {t(`you.balanceRadar.areas.${id}`)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {scores.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line px-4 py-8 text-center font-body text-sm text-ink-3">
          {t('you.lifeArea.empty')}
        </p>
      ) : (
        <ul className="mt-5 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {scores.map((area) => {
            const content = contentByArea[area.id] ?? EMPTY_LIFE_AREA_CONTENT;
            const motto = resolveLifeAreaMotto(area.id, content.motivationalPhrase, t);
            const assetCount = countAreaAssets(content);
            const thumb = content.images[0];

            return (
              <li key={area.id} className="relative min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    hyperspaceNavigate(`/you/areas/${area.id}`);
                  }}
                  className="group flex h-full w-full flex-col rounded-2xl border border-line-soft/80 bg-white p-4 text-left shadow-soft transition-colors hover:border-blue/40 hover:bg-blue-soft/20"
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: LIFE_AREA_DOT_COLOR[area.id] }}
                      aria-hidden
                    />
                    <span className="truncate font-body text-sm font-semibold text-blue">
                      {t(`you.balanceRadar.areas.${area.id}`)}
                    </span>
                  </span>
                  <span
                    className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-bg-deep-cream"
                    role="progressbar"
                    aria-valuenow={area.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span
                      className="block h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${String(area.score)}%`,
                        backgroundColor: LIFE_AREA_DOT_COLOR[area.id],
                      }}
                    />
                  </span>
                  <span className="mt-2 font-body text-xs tabular-nums text-ink-3">
                    {t('you.lifeArea.scoreOutOf', { score: area.score })}
                  </span>

                  {motto ? (
                    <span className="mt-3 line-clamp-2 font-display text-xs leading-snug text-ink-2 italic sm:text-sm">
                      {motto}
                    </span>
                  ) : null}

                  {thumb ? (
                    <span className="mt-3 block overflow-hidden rounded-xl border border-line-soft">
                      <img
                        src={thumb.dataUrl}
                        alt=""
                        className="aspect-[16/9] w-full object-cover"
                      />
                    </span>
                  ) : null}

                  {assetCount > 0 ? (
                    <span className="mt-3 flex flex-wrap gap-2 font-body text-[11px] font-semibold text-ink-3">
                      {content.links.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5">
                          <Link2 className="size-3" aria-hidden />
                          {content.links.length}
                        </span>
                      ) : null}
                      {content.documents.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5">
                          <FileText className="size-3" aria-hidden />
                          {content.documents.length}
                        </span>
                      ) : null}
                      {content.images.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5">
                          <ImageIcon className="size-3" aria-hidden />
                          {content.images.length}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPendingRemoveAreaId(area.id);
                  }}
                  className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full border border-line-soft bg-white/95 text-ink-3 opacity-80 transition-opacity hover:text-ink group-hover:opacity-100"
                  aria-label={t('you.lifeArea.removeArea', {
                    area: t(`you.balanceRadar.areas.${area.id}`),
                  })}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pendingRemoveAreaId !== null}
        title={t('you.lifeArea.deleteAreaConfirmTitle')}
        description={t('you.lifeArea.deleteAreaConfirmDescription', {
          area: pendingAreaLabel,
        })}
        confirmLabel={t('you.lifeArea.deleteAreaConfirmAction')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          if (pendingRemoveAreaId) {
            removeArea(pendingRemoveAreaId);
          }
          setPendingRemoveAreaId(null);
        }}
        onCancel={() => {
          setPendingRemoveAreaId(null);
        }}
      />
    </section>
  );
}

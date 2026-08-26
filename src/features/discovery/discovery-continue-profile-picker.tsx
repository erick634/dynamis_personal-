import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  buildContinueProfileSuggestionCopy,
  daysSinceActivity,
  isLifeAreaStale,
  lifeAreaLastActivityMs,
  pickSuggestedLifeAreaId,
} from '@/features/discovery/continue-profile-suggestion';
import { LIFE_AREA_DOT_COLOR, type LifeAreaId } from '@/features/intent-profile/life-area-scores';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { useLifeAreas } from '@/features/intent-profile/use-life-areas';
import { listProfiles } from '@/features/profiles/profiles-api';
import { useIntentProfile } from '@/features/you/use-intent-profile';
import { useCurrentUser } from '@/stores/current-user';

export type ContinueProfileChoice =
  | { kind: 'lifeArea'; areaId: LifeAreaId }
  | { kind: 'profile'; profileId: string; title: string };

type DiscoveryContinueProfilePickerProps = {
  onConfirm: (choice: ContinueProfileChoice) => void;
  onBack: () => void;
  disabled?: boolean;
};

export function DiscoveryContinueProfilePicker({
  onConfirm,
  onBack,
  disabled = false,
}: DiscoveryContinueProfilePickerProps) {
  const { t } = useTranslation();
  const userId = useCurrentUser((state) => state.user?.userId);
  const { profile } = useIntentProfile();
  const activeAreaIds = useLifeAreas((state) => state.activeAreaIds);
  const goalsByArea = useLifeAreaGoals((state) => state.goalsByArea);
  const now = Date.now();

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles', userId],
    queryFn: () => {
      if (!userId) throw new Error('userId is required');
      return listProfiles(userId);
    },
    enabled: Boolean(userId),
  });

  const suggestedAreaId = useMemo(
    () => pickSuggestedLifeAreaId(activeAreaIds, goalsByArea),
    [activeAreaIds, goalsByArea],
  );

  const staleProfile = useMemo(() => {
    if (profiles.length === 0) return null;
    return (
      [...profiles].sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at))[0] ?? null
    );
  }, [profiles]);

  const [selected, setSelected] = useState<ContinueProfileChoice | null>(null);

  const effectiveSelection: ContinueProfileChoice | null =
    selected ??
    (suggestedAreaId
      ? { kind: 'lifeArea', areaId: suggestedAreaId }
      : staleProfile
        ? { kind: 'profile', profileId: staleProfile.id, title: staleProfile.title }
        : null);

  const suggestionCopy = buildContinueProfileSuggestionCopy({
    suggestedAreaId,
    staleProfile,
    goalsByArea,
    activeFocus: profile?.activeFocus,
    now,
    t,
  });

  const hasAnything = activeAreaIds.length > 0 || profiles.length > 0;

  return (
    <div className="mt-8 w-full max-w-md text-left">
      <p className="font-body text-sm font-medium text-white/80">
        {t('discovery.intent.continueProfile.listPrompt')}
      </p>

      {suggestionCopy ? (
        <p className="mt-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 font-body text-xs leading-relaxed text-white/75">
          {suggestionCopy}
        </p>
      ) : null}

      {!hasAnything && !profilesLoading ? (
        <p className="mt-3 font-body text-sm text-white/70">
          {t('discovery.intent.continueProfile.empty')}
        </p>
      ) : null}

      {activeAreaIds.length > 0 ? (
        <div className="mt-4">
          <p className="font-body text-[11px] font-semibold tracking-wide text-white/55 uppercase">
            {t('discovery.intent.continueProfile.lifeAreasHeading')}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {activeAreaIds.map((areaId) => {
              const activity = lifeAreaLastActivityMs(goalsByArea[areaId]);
              const stale = isLifeAreaStale(activity, now);
              const isSelected =
                effectiveSelection?.kind === 'lifeArea' && effectiveSelection.areaId === areaId;
              const isSuggested = suggestedAreaId === areaId;
              return (
                <li key={areaId}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelected({ kind: 'lifeArea', areaId });
                    }}
                    className={[
                      'flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:opacity-50',
                      isSelected
                        ? 'border-white/35 bg-white/20'
                        : 'border-white/15 bg-white/10 hover:bg-white/15',
                    ].join(' ')}
                  >
                    <span
                      className="mt-1.5 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: LIFE_AREA_DOT_COLOR[areaId] }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-body text-sm font-semibold text-white">
                          {t(`you.balanceRadar.areas.${areaId}`)}
                        </span>
                        {isSuggested ? (
                          <span className="rounded-full bg-white/15 px-2 py-0.5 font-body text-[10px] font-semibold text-white/80">
                            {t('discovery.intent.continueProfile.suggestedBadge')}
                          </span>
                        ) : null}
                        {stale ? (
                          <span className="rounded-full bg-ember/30 px-2 py-0.5 font-body text-[10px] font-semibold text-white/85">
                            {t('discovery.intent.continueProfile.staleBadge', {
                              days: daysSinceActivity(activity, now),
                            })}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {profiles.length > 0 ? (
        <div className="mt-4">
          <p className="font-body text-[11px] font-semibold tracking-wide text-white/55 uppercase">
            {t('discovery.intent.continueProfile.profilesHeading')}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {profiles.map((item) => {
              const updatedMs = Date.parse(item.updated_at);
              const stale = isLifeAreaStale(Number.isNaN(updatedMs) ? 0 : updatedMs, now);
              const isSelected =
                effectiveSelection?.kind === 'profile' && effectiveSelection.profileId === item.id;
              const isSuggested = staleProfile?.id === item.id && activeAreaIds.length === 0;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelected({
                        kind: 'profile',
                        profileId: item.id,
                        title: item.title,
                      });
                    }}
                    className={[
                      'flex w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-colors disabled:opacity-50',
                      isSelected
                        ? 'border-white/35 bg-white/20'
                        : 'border-white/15 bg-white/10 hover:bg-white/15',
                    ].join(' ')}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-body text-sm font-semibold text-white">
                        {item.title}
                      </span>
                      {item.is_primary ? (
                        <span className="rounded-full bg-white/15 px-2 py-0.5 font-body text-[10px] font-semibold text-white/80">
                          {t('discovery.intent.continueProfile.primaryBadge')}
                        </span>
                      ) : null}
                      {isSuggested ? (
                        <span className="rounded-full bg-white/15 px-2 py-0.5 font-body text-[10px] font-semibold text-white/80">
                          {t('discovery.intent.continueProfile.suggestedBadge')}
                        </span>
                      ) : null}
                      {stale ? (
                        <span className="rounded-full bg-ember/30 px-2 py-0.5 font-body text-[10px] font-semibold text-white/85">
                          {t('discovery.intent.continueProfile.staleBadge', {
                            days: daysSinceActivity(Number.isNaN(updatedMs) ? 0 : updatedMs, now),
                          })}
                        </span>
                      ) : null}
                    </span>
                    {item.context?.trim() ? (
                      <span className="line-clamp-2 font-body text-xs text-white/60">
                        {item.context}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || !effectiveSelection}
          onClick={() => {
            if (effectiveSelection) onConfirm(effectiveSelection);
          }}
          className="rounded-full bg-white px-4 py-2 font-body text-xs font-semibold text-ink disabled:opacity-50"
        >
          {t('discovery.intent.continueProfile.confirm')}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onBack}
          className="rounded-full border border-white/25 bg-white/10 px-4 py-2 font-body text-xs font-semibold text-white/85"
        >
          {t('discovery.intent.continueProfile.back')}
        </button>
      </div>
    </div>
  );
}

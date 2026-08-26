import { ArrowLeft, Briefcase } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { deriveProfileSignalsFromIntentProfile } from '@/features/discovery/derive-profile-signals';
import { LifeAreaAgentSuggestionPanel } from '@/features/intent-profile/life-area-agent-suggestion-panel';
import { LifeAreaAssetsPanel } from '@/features/intent-profile/life-area-assets-panel';
import { LIFE_AREA_DETAILS } from '@/features/intent-profile/life-area-detail-content';
import { buildAreaScoreBreakdown } from '@/features/intent-profile/life-area-goal-progress';
import { LifeAreaGoalsPanel } from '@/features/intent-profile/life-area-goals-panel';
import { LifeAreaGrowingPanel } from '@/features/intent-profile/life-area-growing-panel';
import { LifeAreaScoreBreakdownDialog } from '@/features/intent-profile/life-area-score-breakdown-dialog';
import {
  buildGoalProgressByArea,
  buildLifeAreaScores,
  LIFE_AREA_DOT_COLOR,
} from '@/features/intent-profile/life-area-scores';
import { parseLifeAreaId, useLifeAreas } from '@/features/intent-profile/use-life-areas';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { resolveLifeAreaMotto } from '@/features/intent-profile/resolve-life-area-motto';
import { LifeAreaShareCommentsPanel } from '@/features/share/life-area-share-comments-panel';
import { useIntentProfile } from '@/features/you/use-intent-profile';

function ScoreRing({
  score,
  color,
  onClick,
  openLabel,
}: {
  score: number;
  color: string;
  onClick: () => void;
  openLabel: string;
}) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={openLabel}
      title={openLabel}
      className="relative h-20 w-20 shrink-0 rounded-full transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
    >
      <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72" aria-hidden>
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--bg-deep-cream)"
          strokeWidth="7"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-semibold tabular-nums text-ink">
        {score}
      </span>
    </button>
  );
}

type EditableSummaryProps = {
  value: string;
  fallback: string;
  onSave: (next: string) => void;
};

function EditableSummary({ value, fallback, onSave }: EditableSummaryProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value || fallback);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft(value || fallback);
  }, [value, fallback, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [isEditing]);

  function commit() {
    const trimmed = draft.trim();
    onSave(trimmed === fallback.trim() ? '' : trimmed);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <textarea
        ref={inputRef}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            commit();
          }
          if (event.key === 'Escape') {
            setDraft(value || fallback);
            setIsEditing(false);
          }
        }}
        rows={2}
        aria-label={t('you.lifeArea.summary.editLabel')}
        className="mt-2 max-w-2xl w-full resize-none rounded-lg border border-line bg-white px-2.5 py-1.5 font-body text-base leading-relaxed text-ink outline-none focus:border-blue/50"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setIsEditing(true);
      }}
      title={t('you.lifeArea.summary.editHint')}
      aria-label={t('you.lifeArea.summary.editLabel')}
      className="mt-2 max-w-2xl w-full rounded-lg px-1 py-0.5 text-left font-body text-base leading-relaxed text-ink-2 transition-colors hover:bg-bg-deep-cream/60 hover:text-ink"
    >
      {value.trim() || fallback}
    </button>
  );
}

export function LifeAreaDetailScreen() {
  const { areaId: rawAreaId } = useParams<{ areaId: string }>();
  const areaId = parseLifeAreaId(rawAreaId);
  const { t } = useTranslation();
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const [isScoreBreakdownOpen, setIsScoreBreakdownOpen] = useState(false);
  const activeAreaIds = useLifeAreas((state) => state.activeAreaIds);
  const areaContent = useLifeAreas((state) => (areaId ? state.getContent(areaId) : null));
  const setSummary = useLifeAreas((state) => state.setSummary);
  const goalsByArea = useLifeAreaGoals((state) => state.goalsByArea);
  const { profile } = useIntentProfile();

  if (!areaId) {
    return <Navigate to="/you" replace />;
  }

  if (!activeAreaIds.includes(areaId)) {
    return <Navigate to="/you" replace />;
  }

  const signals = deriveProfileSignalsFromIntentProfile(profile);
  const professionalScore = Math.round(
    (signals.values + signals.mission + signals.strengths + signals.constraints) / 4,
  );
  const areaGoals = goalsByArea[areaId] ?? [];
  const scoreBreakdown = buildAreaScoreBreakdown(areaGoals);
  const goalProgressByArea = buildGoalProgressByArea(goalsByArea);
  const scoreEntry = buildLifeAreaScores(professionalScore, [areaId], goalProgressByArea)[0];
  const score = scoreEntry?.score ?? 0;
  const detail = LIFE_AREA_DETAILS[areaId];
  const color = LIFE_AREA_DOT_COLOR[areaId];
  const motto = resolveLifeAreaMotto(areaId, areaContent?.motivationalPhrase ?? '', t);
  const defaultSummary = t(detail.summaryKey);
  const summary = (areaContent?.summary ?? '').trim() || defaultSummary;

  return (
    <div className="w-full min-w-0 bg-bg font-body text-ink">
      <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-8 sm:px-6 md:px-8 md:py-10">
        <Link
          to="/you"
          className="inline-flex items-center gap-2 font-body text-sm font-medium text-ink-2 transition-colors hover:text-blue"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('you.lifeArea.backToBalance')}
        </Link>

        <article className="mt-6 rounded-3xl border border-line-soft/80 bg-white p-5 shadow-soft sm:p-7 md:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-2 font-body text-[11px] font-semibold tracking-[0.16em] text-ink-3 uppercase">
                <Briefcase className="size-3.5" style={{ color }} aria-hidden />
                {t('you.lifeArea.eyebrow')}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                {t(`you.balanceRadar.areas.${areaId}`)}
              </h1>
              <EditableSummary
                value={areaContent?.summary ?? ''}
                fallback={defaultSummary}
                onSave={(next) => {
                  setSummary(areaId, next);
                }}
              />
            </div>
            <div className="flex max-w-md items-center gap-3 sm:gap-4">
              <p className="min-w-0 flex-1 text-right font-display text-sm leading-snug text-ink-2 italic sm:text-[0.95rem]">
                {motto}
              </p>
              <ScoreRing
                score={score}
                color={color}
                onClick={() => {
                  setIsScoreBreakdownOpen(true);
                }}
                openLabel={t('you.lifeArea.scoreBreakdown.open')}
              />
            </div>
          </header>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <LifeAreaGoalsPanel
              areaId={areaId}
              expanded={goalsExpanded}
              onExpandedChange={setGoalsExpanded}
            />

            <LifeAreaGrowingPanel areaId={areaId} accentColor={color} />
          </div>

          <LifeAreaAgentSuggestionPanel areaId={areaId} summary={summary} motto={motto} />

          <LifeAreaAssetsPanel areaId={areaId} />
          <LifeAreaShareCommentsPanel areaId={areaId} />
        </article>
      </div>

      <LifeAreaScoreBreakdownDialog
        open={isScoreBreakdownOpen}
        score={score}
        accentColor={color}
        breakdown={scoreBreakdown}
        onClose={() => {
          setIsScoreBreakdownOpen(false);
        }}
      />
    </div>
  );
}

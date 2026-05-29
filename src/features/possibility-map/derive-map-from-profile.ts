import type { IntentProfile } from '@/features/you/intent-profile-types';
import type { Dimension, DimensionId, PossibilityMap } from '@/types/possibility-map';

const LEVERAGE_MIN = 120;
const LEVERAGE_MAX = 400;

const DESCRIPTION_MAX_LENGTH = 220;

const NAME_BY_ID: Record<DimensionId, string> = {
  aiDisruption: 'Navigating AI Disruption',
  careerReinvention: 'Career Reinvention',
  healthLongevity: 'Health & Longevity',
  purposeMeaning: 'Purpose & Meaning',
};

const ICON_BY_ID: Record<DimensionId, Dimension['icon']> = {
  aiDisruption: 'brain',
  careerReinvention: 'briefcase',
  healthLongevity: 'heart',
  purposeMeaning: 'compass',
};

function truncateText(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

function nonEmpty(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function includesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function leverageFromScore(score: number): number {
  const clamped = Math.min(100, Math.max(0, score));
  return Math.round(LEVERAGE_MIN + (clamped / 100) * (LEVERAGE_MAX - LEVERAGE_MIN));
}

function scoreAiDisruption(profile: IntentProfile): number {
  let score = 35;
  const role = nonEmpty(profile.roleContext);
  const summary = nonEmpty(profile.longTermSummary);
  const focus = nonEmpty(profile.activeFocus);
  const strengths = nonEmpty(profile.strengths);

  if (role) {
    score += 20;
    if (includesAny(role, ['design', 'engineer', 'developer', 'product', 'ai', 'tech'])) {
      score += 15;
    }
  }
  if (summary && includesAny(summary, ['ai', 'automation', 'tool', 'interface', 'product'])) {
    score += 20;
  }
  if (focus && includesAny(focus, ['ai', 'build', 'ship', 'sprint'])) {
    score += 10;
  }
  if (strengths) {
    score += 10;
  }
  return score;
}

function scoreCareer(profile: IntentProfile): number {
  let score = 30;
  const aspirations = nonEmpty(profile.aspirations);
  const strengths = nonEmpty(profile.strengths);
  const role = nonEmpty(profile.roleContext);

  if (aspirations) {
    score += 30;
  }
  if (strengths) {
    score += 15;
  }
  if (role) {
    score += 10;
  }
  if (nonEmpty(profile.longTermSummary)) {
    score += 15;
  }
  return score;
}

function scoreHealth(profile: IntentProfile): number {
  let score = 25;
  const values = profile.valuesList?.filter((value) => value.trim().length > 0) ?? [];
  const weaknesses = nonEmpty(profile.weaknesses);

  if (values.length >= 2) {
    score += 25;
  } else if (values.length === 1) {
    score += 15;
  }
  if (
    weaknesses &&
    includesAny(weaknesses, ['energy', 'balance', 'burnout', 'sleep', 'health', 'recovery'])
  ) {
    score += 20;
  }
  const summary = nonEmpty(profile.longTermSummary);
  if (summary && includesAny(summary, ['reflection', 'habit', 'walk', 'family'])) {
    score += 20;
  }
  return score;
}

function scorePurpose(profile: IntentProfile): number {
  let score = 30;
  if (nonEmpty(profile.aspirations)) {
    score += 25;
  }
  if (nonEmpty(profile.activeFocus)) {
    score += 20;
  }
  if (nonEmpty(profile.weaknesses)) {
    score += 10;
  }
  if (nonEmpty(profile.notes)) {
    score += 10;
  }
  if (nonEmpty(profile.longTermSummary)) {
    score += 15;
  }
  return score;
}

function profileContextLine(profile: IntentProfile): string | null {
  return (
    nonEmpty(profile.longTermSummary) ??
    nonEmpty(profile.activeFocus) ??
    nonEmpty(profile.notes) ??
    null
  );
}

function describeAiDisruption(profile: IntentProfile): string {
  const role = nonEmpty(profile.roleContext);
  const strengths = nonEmpty(profile.strengths);
  const context = profileContextLine(profile);

  if (role && strengths) {
    return truncateText(
      `As ${role}, your edge is ${strengths} — AI can handle synthesis and variation so you focus on judgment calls only you can make.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  if (role) {
    return truncateText(
      `In your work as ${role}, AI shifts what one person can ship. The leverage is yours to claim in the work only you can judge.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  if (context) {
    return truncateText(
      `From what you've shared — ${context} — AI multiplies your reach when you anchor on the human calls that matter.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  return 'AI is reshaping what one person can accomplish. The leverage is yours to claim.';
}

function describeCareerReinvention(profile: IntentProfile): string {
  const aspirations = nonEmpty(profile.aspirations);
  const strengths = nonEmpty(profile.strengths);
  const role = nonEmpty(profile.roleContext);

  if (aspirations && strengths) {
    return truncateText(
      `Your aspiration — ${aspirations} — pairs with ${strengths}. The capability gap between here and there is collapsing faster than you think.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  if (aspirations) {
    return truncateText(
      `Your aspiration — ${aspirations} — is closer than it looks. The path is clearer once you name the next obvious step.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  if (role && strengths) {
    return truncateText(
      `${strengths} in ${role} is a rare stack. AI closes the distance to the role you're building toward.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  return 'The path you want is closer than it looks. The capability gap is collapsing.';
}

function describeHealthLongevity(profile: IntentProfile): string {
  const values =
    profile.valuesList?.filter((value) => typeof value === 'string' && value.trim().length > 0) ??
    [];
  const weaknesses = nonEmpty(profile.weaknesses);

  if (values.length >= 2) {
    const first = values[0] ?? '';
    const second = values[1] ?? '';
    return truncateText(
      `Sustaining ${first} and ${second} over the long arc — energy, recovery, and focus treated as compounding assets, not leftovers.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  if (values.length === 1) {
    return truncateText(
      `Protecting ${values[0] ?? ''} over the long arc — your energy curve matters as much as your output curve.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  if (weaknesses) {
    return truncateText(
      `Watching ${weaknesses} — building recovery and rhythm before the next push is how you stay in the game.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  return 'Decade-long energy curve, not annual. Sleep, recovery, and cognition treated as compounding assets.';
}

function describePurposeMeaning(profile: IntentProfile): string {
  const aspirations = nonEmpty(profile.aspirations);
  const weaknesses = nonEmpty(profile.weaknesses);
  const focus = nonEmpty(profile.activeFocus);

  if (aspirations && focus) {
    return truncateText(
      `Closing the gap toward ${aspirations} — this week's focus on ${focus} is the thread that ties daily work to what matters.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  if (aspirations && weaknesses) {
    return truncateText(
      `Closing the gap toward ${aspirations} — growing through ${weaknesses} is the work that gives the Unlock Plan weight.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  if (aspirations) {
    return truncateText(
      `Closing the gap between where you are and ${aspirations} — that's the work that matters.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  if (focus) {
    return truncateText(
      `Your active focus — ${focus} — is where purpose takes shape in what you do next.`,
      DESCRIPTION_MAX_LENGTH,
    );
  }
  return 'The work that closes the gap between who you are and who you are becoming.';
}

function buildDimension(profile: IntentProfile, id: DimensionId): Dimension {
  const scoreById: Record<DimensionId, number> = {
    aiDisruption: scoreAiDisruption(profile),
    careerReinvention: scoreCareer(profile),
    healthLongevity: scoreHealth(profile),
    purposeMeaning: scorePurpose(profile),
  };

  const describeById: Record<DimensionId, (p: IntentProfile) => string> = {
    aiDisruption: describeAiDisruption,
    careerReinvention: describeCareerReinvention,
    healthLongevity: describeHealthLongevity,
    purposeMeaning: describePurposeMeaning,
  };

  return {
    id,
    name: NAME_BY_ID[id],
    leveragePercent: leverageFromScore(scoreById[id]),
    description: describeById[id](profile),
    icon: ICON_BY_ID[id],
  };
}

export function deriveMapFromProfile(profile: IntentProfile): PossibilityMap {
  const dimensionIds: DimensionId[] = [
    'aiDisruption',
    'careerReinvention',
    'healthLongevity',
    'purposeMeaning',
  ];

  return {
    userId: profile.userId,
    updatedAt: profile.updatedAt ?? new Date().toISOString(),
    dimensions: dimensionIds.map((id) => buildDimension(profile, id)),
  };
}

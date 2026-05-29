import type { ProfileSignals } from '@/features/discovery/discovery-types';
import type { IntentProfile } from '@/features/you/intent-profile-types';
import type { ProfileDimension } from '@/types/intent-profile';

const BASELINE: ProfileSignals = {
  values: 8,
  mission: 8,
  strengths: 8,
  constraints: 8,
};

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function textScore(text: string | null | undefined, target = 120): number {
  if (!text?.trim()) {
    return 0;
  }
  return clamp(15 + (text.trim().length / target) * 85);
}

/**
 * Client-side fallback when /discovery-signals is unavailable.
 * Mirrors backend heuristics at a high level.
 */
export function deriveProfileSignalsFromIntentProfile(
  profile: IntentProfile | null,
): ProfileSignals {
  if (!profile) {
    return { ...BASELINE };
  }

  const valuesList = profile.valuesList?.filter((value) => value.trim().length > 0) ?? [];
  let values = 0;
  if (valuesList.length > 0) {
    values = clamp(valuesList.length * 12 + valuesList.join(' ').length / 2.5);
  }

  const mission = clamp(
    Math.max(
      textScore(profile.aspirations, 200),
      textScore(profile.roleContext, 160) * 0.9,
      textScore(profile.activeFocus, 120) * 0.8,
      textScore(profile.longTermSummary, 240) * 0.45,
    ),
  );

  return {
    values,
    mission,
    strengths: textScore(profile.strengths, 150),
    constraints: textScore(profile.weaknesses, 150),
  };
}

const KEYWORDS: Record<ProfileDimension, string[]> = {
  values: ['value', 'family', 'integrity', 'balance', 'care', 'health'],
  mission: ['goal', 'mission', 'purpose', 'career', 'build', 'climate', 'focus'],
  strengths: ['strength', 'skill', 'talent', 'excel', 'capable'],
  constraints: ['worry', 'struggle', 'hard', 'fear', 'block', 'stress'],
};

export function boostSignalsFromUserMessages(
  base: ProfileSignals,
  messages: string[],
): ProfileSignals {
  const boosts: ProfileSignals = { values: 0, mission: 0, strengths: 0, constraints: 0 };

  for (const message of messages) {
    const lower = message.toLowerCase();
    for (const dimension of Object.keys(KEYWORDS) as ProfileDimension[]) {
      for (const keyword of KEYWORDS[dimension]) {
        if (lower.includes(keyword)) {
          boosts[dimension] += 4;
        }
      }
    }
  }

  return {
    values: clamp(base.values + boosts.values),
    mission: clamp(base.mission + boosts.mission),
    strengths: clamp(base.strengths + boosts.strengths),
    constraints: clamp(base.constraints + boosts.constraints),
  };
}

export function deriveInsightFromMessages(
  messages: string[],
  profile: IntentProfile | null,
  fallback: string,
): string {
  const frequency = new Map<string, number>();
  const stop = new Set(['that', 'this', 'with', 'have', 'from', 'your', 'about', 'what', 'when']);

  for (const message of messages) {
    const words = message.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
    for (const word of words) {
      if (stop.has(word)) {
        continue;
      }
      frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }
  }

  const repeated = [...frequency.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  if (repeated.length >= 2) {
    const first = repeated[0];
    const second = repeated[1];
    if (!first || !second) {
      return fallback;
    }
    const [w1, c1] = first;
    const [w2, c2] = second;
    return `Pattern emerging: you return to "${w1}" ${String(c1)} times and "${w2}" ${String(c2)} times — there may be a thread between what you keep circling and what you want next.`;
  }

  if (repeated.length === 1) {
    const entry = repeated[0];
    if (!entry) {
      return fallback;
    }
    const [word, count] = entry;
    return `Pattern emerging: "${word}" shows up ${String(count)} times in what you share — worth naming explicitly in your next reply.`;
  }

  const focus = profile?.activeFocus?.trim();
  if (focus) {
    return `Early signal: your active focus — "${focus.length > 90 ? `${focus.slice(0, 89)}…` : focus}" — is anchoring how we read your Intent Profile.`;
  }

  if (messages.length > 0) {
    return 'Keep sharing — each reply sharpens the four dimensions of your Intent Profile.';
  }

  return fallback;
}

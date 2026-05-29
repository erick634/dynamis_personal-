import type { IntentProfile } from '@/features/you/intent-profile-types';

function stableSlice(text: string, max = 120): string {
  return text.trim().slice(0, max);
}

/** Changes when profile fields that feed the map change — used to invalidate cached maps. */
export function profileMapFingerprint(profile: IntentProfile): string {
  const payload = {
    updatedAt: profile.updatedAt ?? '',
    roleContext: profile.roleContext ?? '',
    aspirations: profile.aspirations ?? '',
    strengths: profile.strengths ?? '',
    weaknesses: profile.weaknesses ?? '',
    valuesList: profile.valuesList ?? [],
    activeFocus: profile.activeFocus ?? '',
    notes: stableSlice(profile.notes ?? ''),
    longTermSummary: stableSlice(profile.longTermSummary ?? '', 400),
  };
  return JSON.stringify(payload);
}

export function isProfileReadyForMap(profile: IntentProfile | null): boolean {
  if (!profile) {
    return false;
  }

  const hasText = (value: string | null | undefined) =>
    typeof value === 'string' && value.trim().length > 0;

  if (
    hasText(profile.roleContext) ||
    hasText(profile.aspirations) ||
    hasText(profile.strengths) ||
    hasText(profile.activeFocus) ||
    hasText(profile.longTermSummary) ||
    hasText(profile.notes)
  ) {
    return true;
  }

  return profile.valuesList?.some((value) => value.trim().length > 0) ?? false;
}

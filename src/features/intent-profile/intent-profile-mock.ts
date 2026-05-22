import type { IntentProfile } from '@/types/intent-profile';

/** Canonical demo Intent Profile (rule 12). */
export const MOCK_INTENT_PROFILE: IntentProfile = {
  userId: 'dummy-user-001',
  mission:
    "Make climate adaptation obvious for people who don't think of themselves as climate people.",
  values: ['Agency'],
  strengths: ['Synthesis'],
  patternsToWatch: ['Activation gap'],
  vision: 'Founder · Author · Community',
  confidence: 0.87,
  updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
};

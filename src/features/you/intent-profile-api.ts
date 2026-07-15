import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

import type { IntentProfile, IntentProfileRow } from '@/features/you/intent-profile-types';
import { mapRowToProfile } from '@/features/you/intent-profile-types';

type ProfileEnvelope = {
  profile: IntentProfileRow | null;
};

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (DYNAMIS_JWT.trim()) {
    headers.Authorization = `Bearer ${DYNAMIS_JWT}`;
  }
  return headers;
}

function isProfileRow(value: unknown): value is IntentProfileRow {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.user_id === 'string' && record.user_id.trim().length > 0;
}

/**
 * Fetches the Intent Profile from the Express backend (Prisma/Mongo).
 * Returns null when the profile has not been generated yet (200 + profile: null).
 */
export async function fetchIntentProfile(userId: string): Promise<IntentProfile | null> {
  const response = await fetch(`${API_BASE_URL}/profile/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch intent profile (${String(response.status)})`);
  }

  const data = (await response.json()) as ProfileEnvelope;
  if (data.profile === null) {
    return null;
  }
  if (!isProfileRow(data.profile)) {
    throw new Error('Invalid profile payload from backend.');
  }

  return mapRowToProfile(data.profile);
}

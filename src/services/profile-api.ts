import type { IntentProfile } from '@/types/intent-profile';

import { API_BASE_URL } from '@/lib/config';

export async function fetchIntentProfile(userId: string): Promise<IntentProfile> {
  const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch intent profile (${String(response.status)})`);
  }
  return response.json() as Promise<IntentProfile>;
}

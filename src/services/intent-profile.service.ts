import { MOCK_INTENT_PROFILE } from '@/features/intent-profile/intent-profile-mock';
import type { IntentProfile } from '@/types/intent-profile';

// TODO(backend): import { API_BASE_URL } from '@/lib/config';
// TODO(backend): fetch(`${API_BASE_URL}/api/profile/${userId}`) when GET /api/profile/{user_id} is ready

export async function getIntentProfile(userId: string): Promise<IntentProfile> {
  void userId;
  return Promise.resolve(MOCK_INTENT_PROFILE);
}

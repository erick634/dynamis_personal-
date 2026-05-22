import { MOCK_TODAY_COUNCIL } from '@/features/today/council-mock';
import type { TodayCouncil } from '@/types/council';

// TODO(backend): import { API_BASE_URL } from '@/lib/config';
// TODO(backend): fetch(`${API_BASE_URL}/api/council/today/${userId}`) when endpoint is ready

export async function getTodayCouncil(userId: string): Promise<TodayCouncil> {
  void userId;
  return Promise.resolve(MOCK_TODAY_COUNCIL);
}

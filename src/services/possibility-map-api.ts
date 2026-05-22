import { API_BASE_URL } from '@/lib/config';
import type { PossibilityMap } from '@/types/possibility-map';

export async function fetchPossibilityMap(userId: string): Promise<PossibilityMap> {
  const response = await fetch(`${API_BASE_URL}/api/possibility-map/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch possibility map (${String(response.status)})`);
  }
  return response.json() as Promise<PossibilityMap>;
}

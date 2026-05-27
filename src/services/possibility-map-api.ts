import { climateAdaptationMockMap } from '@/features/possibility-map/possibility-map-mock';
import type { PossibilityMap } from '@/types/possibility-map';

export async function getPossibilityMap(userId: string): Promise<PossibilityMap> {
  // TODO(backend): substituir por fetch GET /api/possibility-map/{userId}
  // quando o endpoint estiver disponível (rule 13)
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { ...climateAdaptationMockMap, userId };
}

/** @deprecated Use getPossibilityMap */
export const fetchPossibilityMap = getPossibilityMap;

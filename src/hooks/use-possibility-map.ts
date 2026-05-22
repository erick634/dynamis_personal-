import { useQuery } from '@tanstack/react-query';

import { MOCK_POSSIBILITY_MAP } from '@/features/possibility-map/possibility-map-mock';
import { useDemoUserId } from '@/hooks/use-demo-user-id';
import { fetchPossibilityMap } from '@/services/possibility-map-api';

export function usePossibilityMap() {
  const userId = useDemoUserId();

  return useQuery({
    queryKey: ['possibility-map', userId],
    queryFn: async () => {
      try {
        return await fetchPossibilityMap(userId);
      } catch {
        return MOCK_POSSIBILITY_MAP;
      }
    },
    placeholderData: MOCK_POSSIBILITY_MAP,
  });
}

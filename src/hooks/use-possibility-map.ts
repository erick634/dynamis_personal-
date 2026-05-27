import { useQuery } from '@tanstack/react-query';

import { getPossibilityMap } from '@/services/possibility-map-api';

export function usePossibilityMap(userId: string) {
  return useQuery({
    queryKey: ['possibility-map', userId],
    queryFn: () => getPossibilityMap(userId),
  });
}

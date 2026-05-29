import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchGeneratedMap } from '@/features/possibility-map/possibility-map-llm-api';
import {
  clearStoredPossibilityMap,
  getStoredPossibilityMap,
  saveStoredPossibilityMap,
} from '@/features/possibility-map/possibility-map-storage';
import {
  isProfileReadyForMap,
  profileMapFingerprint,
} from '@/features/possibility-map/profile-map-fingerprint';
import {
  resolvePossibilityMapData,
  type MapResolutionSource,
} from '@/features/possibility-map/resolve-possibility-map';
import { useIntentProfile } from '@/features/you/use-intent-profile';
import type { PossibilityMap } from '@/types/possibility-map';

export type UsePossibilityMapResult = {
  map: PossibilityMap;
  source: MapResolutionSource;
  isLoading: boolean;
  isGenerating: boolean;
  hasRealProfile: boolean;
  profileReady: boolean;
  profileLoading: boolean;
  regenerate: () => void;
};

export function usePossibilityMap(userId: string | undefined): UsePossibilityMapResult {
  const queryClient = useQueryClient();
  const { profile, isLoading: profileLoading } = useIntentProfile();

  const profileReady = profile != null && isProfileReadyForMap(profile);
  const fingerprint =
    profile != null && isProfileReadyForMap(profile) ? profileMapFingerprint(profile) : null;

  const stored = userId && fingerprint ? getStoredPossibilityMap(userId) : null;
  const storedMatches =
    stored != null && fingerprint != null && stored.profileFingerprint === fingerprint;

  const shouldFetchLlm = Boolean(userId) && profileReady && !storedMatches;

  const { data: llmDimensions, isFetching: isLlmFetching } = useQuery({
    queryKey: ['possibility-map-llm', userId, fingerprint],
    queryFn: async () => {
      if (!userId) {
        throw new Error('userId is required');
      }
      const dimensions = await fetchGeneratedMap(userId);
      if (!profile || !fingerprint) {
        return dimensions;
      }

      const resolved = resolvePossibilityMapData({
        userId,
        profile,
        llmDimensions: dimensions,
      });

      if (dimensions != null && dimensions.length > 0) {
        saveStoredPossibilityMap({
          userId,
          profileFingerprint: fingerprint,
          map: resolved.map,
          source: 'llm',
          savedAt: new Date().toISOString(),
        });
      } else if (resolved.source === 'derived') {
        saveStoredPossibilityMap({
          userId,
          profileFingerprint: fingerprint,
          map: resolved.map,
          source: 'derived',
          savedAt: new Date().toISOString(),
        });
      }

      return dimensions;
    },
    enabled: shouldFetchLlm,
    staleTime: Infinity,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

  const regenerate = useCallback(() => {
    if (!userId) {
      return;
    }
    clearStoredPossibilityMap(userId);
    void queryClient.invalidateQueries({ queryKey: ['possibility-map-llm', userId] });
  }, [queryClient, userId]);

  const resolved = useMemo(() => {
    if (stored != null && fingerprint != null && stored.profileFingerprint === fingerprint) {
      return {
        map: stored.map,
        source: stored.source,
      };
    }

    return resolvePossibilityMapData({
      userId,
      profile: profileReady ? profile : null,
      llmDimensions: llmDimensions ?? undefined,
    });
  }, [stored, fingerprint, userId, profile, profileReady, llmDimensions]);

  const isGenerating = shouldFetchLlm && isLlmFetching;
  const isLoading = profileLoading || isGenerating;

  return {
    map: resolved.map,
    source:
      stored != null && fingerprint != null && stored.profileFingerprint === fingerprint
        ? stored.source
        : resolved.source,
    isLoading,
    isGenerating,
    hasRealProfile: profileReady,
    profileReady,
    profileLoading,
    regenerate,
  };
}

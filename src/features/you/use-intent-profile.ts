import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchIntentProfile } from '@/features/you/intent-profile-api';
import type { IntentProfile } from '@/features/you/intent-profile-types';
import { useCurrentUser } from '@/stores/current-user';

type UseIntentProfileResult = {
  profile: IntentProfile | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useIntentProfile(): UseIntentProfileResult {
  const user = useCurrentUser((state) => state.user);
  const [profile, setProfile] = useState<IntentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const refetch = useCallback(async () => {
    if (!user?.userId) {
      setProfile(null);
      setIsLoading(false);
      setIsRefreshing(false);
      setError(null);
      return;
    }

    setError(null);
    if (profileRef.current == null) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const next = await fetchIntentProfile(user.userId);
      setProfile(next);
      setError(null);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { profile, isLoading, isRefreshing, error, refetch };
}

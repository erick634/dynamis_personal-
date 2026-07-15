import { useCallback, useEffect, useState } from 'react';

import { fetchIntentProfile } from '@/features/you/intent-profile-api';
import type { IntentProfile } from '@/features/you/intent-profile-types';
import { useCurrentUser } from '@/stores/current-user';

type UseIntentProfileResult = {
  profile: IntentProfile | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useIntentProfile(): UseIntentProfileResult {
  const user = useCurrentUser((state) => state.user);
  const [profile, setProfile] = useState<IntentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user?.userId) {
      setProfile(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const next = await fetchIntentProfile(user.userId);
      setProfile(next);
      setError(null);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { profile, isLoading, error, refetch };
}

import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useCurrentUser } from '@/stores/current-user';

import type { IntentProfile, IntentProfileRow } from '@/features/you/intent-profile-types';
import { mapRowToProfile } from '@/features/you/intent-profile-types';

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

    const { data, error: queryError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.userId)
      .maybeSingle<IntentProfileRow>();

    if (queryError) {
      // Treat "no rows" as a processing state, not as an error.
      if (queryError.code === 'PGRST116') {
        setProfile(null);
        setIsLoading(false);
        setError(null);
        return;
      }
      setProfile(null);
      setIsLoading(false);
      setError(queryError.message);
      return;
    }

    if (!data) {
      setProfile(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setProfile(mapRowToProfile(data));
    setIsLoading(false);
  }, [user?.userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { profile, isLoading, error, refetch };
}

import { useEffect, useState } from 'react';

import { fetchReturnContext, type ReturnContext } from '@/features/onboarding/return-context-api';

type UseReturnContextResult = {
  context: ReturnContext | null;
  isLoading: boolean;
};

export function useReturnContext(userId: string | undefined): UseReturnContextResult {
  const [context, setContext] = useState<ReturnContext | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setContext(null);
      setIsLoading(false);
      return;
    }

    const request = { active: true };
    setIsLoading(true);

    void (async () => {
      try {
        const next = await fetchReturnContext(userId);
        if (request.active) {
          setContext(next);
        }
      } catch {
        if (request.active) {
          setContext({ returning: false, lastTopic: null });
        }
      } finally {
        if (request.active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      request.active = false;
    };
  }, [userId]);

  return { context, isLoading };
}

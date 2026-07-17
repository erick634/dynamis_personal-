/**
 * Keeps the device screen awake during an active voice session (mobile).
 * Uses the Screen Wake Lock API when available; no-ops otherwise.
 */
export type ScreenWakeLockHandle = {
  release: () => Promise<void>;
};

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
};

type WakeLockApi = {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>;
};

export async function acquireScreenWakeLock(): Promise<ScreenWakeLockHandle | null> {
  if (typeof navigator === 'undefined') {
    return null;
  }

  // Avoid intersecting with DOM `Navigator` — its `wakeLock` typing fights runtime guards.
  const wakeLockApi = (navigator as unknown as { wakeLock?: WakeLockApi }).wakeLock;
  if (!wakeLockApi) {
    return null;
  }

  let sentinel: WakeLockSentinelLike | null = null;
  let released = false;

  const request = async () => {
    if (released || document.visibilityState !== 'visible') {
      return;
    }
    try {
      sentinel = await wakeLockApi.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
      });
    } catch {
      // Unsupported, denied, or battery saver — conversation continues without lock.
      sentinel = null;
    }
  };

  await request();

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && !released) {
      void request();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    release: async () => {
      if (released) {
        return;
      }
      released = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      const current = sentinel;
      sentinel = null;
      if (current && !current.released) {
        try {
          await current.release();
        } catch {
          // Ignore release failures on teardown.
        }
      }
    },
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';

import { handleDiscoveryVoiceMessage } from '@/features/discovery/handle-discovery-voice-message';
import type {
  DiscoveryVoiceMode,
  DiscoveryVoiceStatus,
} from '@/features/discovery/discovery-voice-types';
import { StreamingTtsPlayer, type TtsPlaybackState } from '@/features/live/streaming-tts-player';
import { VoiceService } from '@/features/live/voice-service';
import { ALLOW_EMPTY_TOKEN, DYNAMIS_JWT } from '@/lib/config';

export type {
  DiscoveryVoiceMode,
  DiscoveryVoiceStatus,
} from '@/features/discovery/discovery-voice-types';

type UseDiscoveryVoiceOptions = {
  userId: string | undefined;
  isDisabled?: boolean;
  getSessionId?: () => string | null;
  onSessionId?: (sessionId: string) => void;
  onFinalTranscript: (text: string) => void;
  onLiveUserUtterance?: (text: string) => void;
  onLiveAgentReply?: (text: string) => void;
};

function makeSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `discovery-voice-${String(Date.now())}`;
}

export function useDiscoveryVoice({
  userId,
  isDisabled = false,
  getSessionId,
  onSessionId,
  onFinalTranscript,
  onLiveUserUtterance,
  onLiveAgentReply,
}: UseDiscoveryVoiceOptions) {
  const [status, setStatusState] = useState<DiscoveryVoiceStatus>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const serviceRef = useRef<VoiceService | null>(null);
  const playerRef = useRef<StreamingTtsPlayer | null>(null);
  const modeRef = useRef<DiscoveryVoiceMode>('stt_only');
  const statusRef = useRef<DiscoveryVoiceStatus>('idle');
  const streamingActiveRef = useRef(false);
  const interruptPendingRef = useRef(false);

  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;
  const onLiveUserRef = useRef(onLiveUserUtterance);
  onLiveUserRef.current = onLiveUserUtterance;
  const onLiveAgentRef = useRef(onLiveAgentReply);
  onLiveAgentRef.current = onLiveAgentReply;
  const onSessionIdRef = useRef(onSessionId);
  onSessionIdRef.current = onSessionId;
  const getSessionIdRef = useRef(getSessionId);
  getSessionIdRef.current = getSessionId;

  const setStatus = useCallback(
    (next: DiscoveryVoiceStatus | ((prev: DiscoveryVoiceStatus) => DiscoveryVoiceStatus)) => {
      setStatusState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        statusRef.current = resolved;
        return resolved;
      });
    },
    [],
  );

  const teardown = useCallback(async () => {
    streamingActiveRef.current = false;
    interruptPendingRef.current = false;
    playerRef.current?.dispose();
    playerRef.current = null;
    await serviceRef.current?.stop();
    serviceRef.current = null;
    modeRef.current = 'stt_only';
    setStatus('idle');
    setPartialTranscript('');
  }, [setStatus]);

  const interruptAgent = useCallback(() => {
    if (modeRef.current !== 'full' || interruptPendingRef.current) {
      return;
    }
    interruptPendingRef.current = true;
    streamingActiveRef.current = false;
    playerRef.current?.cancel();
    serviceRef.current?.resumeRecorder();
    serviceRef.current?.sendMessage({ type: 'interrupt' });
  }, []);

  const handleTtsPlayerState = useCallback(
    (playback: TtsPlaybackState) => {
      if (modeRef.current !== 'full' || playback !== 'drained') {
        return;
      }
      if (streamingActiveRef.current || interruptPendingRef.current) {
        return;
      }
      serviceRef.current?.resumeRecorder();
      setStatus((prev) => (prev === 'speaking' || prev === 'thinking' ? 'listening' : prev));
    },
    [setStatus],
  );

  const handleMessage = useCallback(
    (message: Parameters<typeof handleDiscoveryVoiceMessage>[0]) => {
      handleDiscoveryVoiceMessage(message, {
        modeRef,
        statusRef,
        streamingActiveRef,
        interruptPendingRef,
        serviceRef,
        playerRef,
        onFinalTranscript: (text) => {
          onFinalRef.current(text);
        },
        onLiveUserUtterance: (text) => {
          onLiveUserRef.current?.(text);
        },
        onLiveAgentReply: (text) => {
          onLiveAgentRef.current?.(text);
        },
        onSessionId: (sessionId) => {
          onSessionIdRef.current?.(sessionId);
        },
        setPartialTranscript,
        setStatus,
        setVoiceError,
        interruptAgent,
        teardown: () => {
          void teardown();
        },
      });
    },
    [interruptAgent, setStatus, teardown],
  );

  const startVoice = useCallback(
    async (mode: DiscoveryVoiceMode = 'stt_only') => {
      if (isDisabled || !userId) {
        return;
      }

      if (!DYNAMIS_JWT.trim() && !ALLOW_EMPTY_TOKEN) {
        setVoiceError('noToken');
        return;
      }

      await teardown();
      setVoiceError(null);
      setStatus('connecting');
      modeRef.current = mode;

      playerRef.current =
        mode === 'full' ? new StreamingTtsPlayer({ onStateChange: handleTtsPlayerState }) : null;

      const service = new VoiceService({
        onMessage: handleMessage,
        onBargeIn:
          mode === 'full'
            ? () => {
                interruptAgent();
              }
            : undefined,
        onClose: () => {
          setStatus((prev) => (prev === 'idle' || prev === 'error' ? prev : 'idle'));
        },
        onError: (error) => {
          const code = /denied|NotAllowed|Permission/i.test(error) ? 'micDenied' : error;
          setVoiceError(code);
          void teardown();
          setStatus('error');
        },
      });

      serviceRef.current = service;

      const existingSessionId = getSessionIdRef.current?.() ?? null;
      const sessionId = existingSessionId ?? makeSessionId();
      if (!existingSessionId) {
        onSessionIdRef.current?.(sessionId);
      }

      try {
        await service.start({
          sessionId,
          token: DYNAMIS_JWT,
          userId,
          mode,
        });
      } catch (err) {
        await teardown();
        const message = err instanceof Error ? err.message : String(err);
        const code = /denied|NotAllowed|Permission/i.test(message) ? 'micDenied' : message;
        setVoiceError(code);
        setStatus('error');
      }
    },
    [handleMessage, handleTtsPlayerState, interruptAgent, isDisabled, setStatus, teardown, userId],
  );

  const stopVoice = useCallback(() => {
    void teardown();
  }, [teardown]);

  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  const isConnecting = status === 'connecting';

  return {
    isVoiceActive: (status !== 'idle' && status !== 'error') || isConnecting,
    isConnecting,
    voiceStatus: status,
    partialTranscript,
    voiceError,
    startVoice,
    stopVoice,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';

import { VoiceService } from '@/features/live/voice-service';
import type { VoiceServerMessage } from '@/features/live/voice-protocol';
import { ALLOW_EMPTY_TOKEN, DYNAMIS_JWT } from '@/lib/config';

type UseDiscoveryVoiceOptions = {
  userId: string | undefined;
  isDisabled?: boolean;
  onFinalTranscript: (text: string) => void;
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
  onFinalTranscript,
}: UseDiscoveryVoiceOptions) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const serviceRef = useRef<VoiceService | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  const teardown = useCallback(async () => {
    await serviceRef.current?.stop();
    serviceRef.current = null;
    setIsActive(false);
    setIsConnecting(false);
    setPartialTranscript('');
  }, []);

  const handleMessage = useCallback(
    (message: VoiceServerMessage) => {
      switch (message.type) {
        case 'ready':
        case 'stt_ready':
          setVoiceError(null);
          setIsConnecting(false);
          setIsActive(true);
          break;

        case 'transcript_partial':
          setPartialTranscript(message.text);
          break;

        case 'transcript_final': {
          const text = message.text.trim();
          setPartialTranscript('');
          if (text) {
            onFinalRef.current(text);
          }
          break;
        }

        case 'warning':
          setVoiceError(message.text ?? message.message ?? null);
          break;

        case 'error':
          setVoiceError(message.text ?? message.message ?? 'Voice error');
          void teardown();
          break;

        case 'terminated':
          void teardown();
          break;

        default:
          break;
      }
    },
    [teardown],
  );

  const startVoice = useCallback(async () => {
    if (isDisabled || !userId) {
      return;
    }

    if (!DYNAMIS_JWT.trim() && !ALLOW_EMPTY_TOKEN) {
      setVoiceError('noToken');
      return;
    }

    await teardown();
    setVoiceError(null);
    setIsConnecting(true);

    const service = new VoiceService({
      onMessage: handleMessage,
      onClose: () => {
        setIsActive(false);
        setIsConnecting(false);
      },
      onError: (error) => {
        const code = /denied|NotAllowed|Permission/i.test(error) ? 'micDenied' : error;
        setVoiceError(code);
        void teardown();
      },
    });

    serviceRef.current = service;

    try {
      await service.start({
        sessionId: makeSessionId(),
        token: DYNAMIS_JWT,
        userId,
        mode: 'stt_only',
      });
    } catch (err) {
      await teardown();
      const message = err instanceof Error ? err.message : String(err);
      const code = /denied|NotAllowed|Permission/i.test(message) ? 'micDenied' : message;
      setVoiceError(code);
    }
  }, [handleMessage, isDisabled, teardown, userId]);

  const stopVoice = useCallback(() => {
    void teardown();
  }, [teardown]);

  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  return {
    isVoiceActive: isActive || isConnecting,
    isConnecting,
    partialTranscript,
    voiceError,
    startVoice,
    stopVoice,
  };
}

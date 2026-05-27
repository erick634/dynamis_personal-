import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ALLOW_EMPTY_TOKEN, DYNAMIS_JWT } from '@/lib/config';
import { StreamingTtsPlayer, type TtsPlaybackState } from '@/features/live/streaming-tts-player';
import { VoiceService } from '@/features/live/voice-service';
import type { VoiceServerMessage } from '@/features/live/voice-protocol';

export type LiveSessionStatus =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'ended';

export type LiveChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
};

type LiveSessionState = {
  status: LiveSessionStatus;
  isMicOn: boolean;
  partialTranscript: string | null;
  inlineError: string | null;
  messages: LiveChatMessage[];
  sessionId: string | null;
};

const INITIAL_STATE: LiveSessionState = {
  status: 'idle',
  isMicOn: true,
  partialTranscript: null,
  inlineError: null,
  messages: [],
  sessionId: null,
};

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `live-${String(Date.now())}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useLiveSession() {
  const [state, setState] = useState<LiveSessionState>(INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const serviceRef = useRef<VoiceService | null>(null);
  const playerRef = useRef<StreamingTtsPlayer | null>(null);
  const streamingActiveRef = useRef(false);
  const interruptPendingRef = useRef(false);

  const interruptAgent = useCallback(() => {
    const current = stateRef.current.status;
    if (interruptPendingRef.current) return;
    if (current !== 'speaking' && current !== 'thinking') return;

    interruptPendingRef.current = true;
    streamingActiveRef.current = false;
    playerRef.current?.cancel();
    serviceRef.current?.resumeRecorder();
    serviceRef.current?.sendMessage({ type: 'interrupt' });
  }, []);

  const handleTtsPlayerState = useCallback((playback: TtsPlaybackState) => {
    if (playback !== 'drained') return;
    if (streamingActiveRef.current) return;
    serviceRef.current?.resumeRecorder();
    setState((prev) => {
      if (prev.status !== 'speaking' && prev.status !== 'thinking' && prev.status !== 'connecting') {
        return prev;
      }
      return { ...prev, status: 'ready' };
    });
  }, []);

  const handleMessage = useCallback(
    (message: VoiceServerMessage) => {
      switch (message.type) {
        case 'ready':
        case 'stt_ready':
          setState((prev) => ({ ...prev, status: 'ready', inlineError: null }));
          break;

        case 'transcript_partial': {
          const text = message.text;
          if (
            text.trim().length > 0 &&
            (stateRef.current.status === 'speaking' || stateRef.current.status === 'thinking')
          ) {
            interruptAgent();
          }
          setState((prev) => ({ ...prev, status: 'listening', partialTranscript: text }));
          break;
        }

        case 'transcript_final': {
          const text = message.text.trim();
          setState((prev) => {
            if (!text) {
              return { ...prev, partialTranscript: null };
            }
            return {
              ...prev,
              partialTranscript: null,
              status: prev.status === 'thinking' ? prev.status : 'thinking',
              messages: [
                ...prev.messages,
                { id: makeId(), role: 'user', text, createdAt: Date.now() },
              ],
            };
          });
          break;
        }

        case 'turn_started':
          setState((prev) => ({ ...prev, status: 'thinking' }));
          break;

        case 'turn_canceled':
          streamingActiveRef.current = false;
          interruptPendingRef.current = false;
          playerRef.current?.cancel();
          serviceRef.current?.resumeRecorder();
          setState((prev) => ({ ...prev, status: 'listening' }));
          break;

        case 'tts_audio_start':
          streamingActiveRef.current = true;
          setState((prev) => ({ ...prev, status: 'speaking' }));
          serviceRef.current?.pauseRecorder();
          playerRef.current?.beginStream();
          break;

        case 'tts_audio_chunk':
          void playerRef.current?.addChunk(message.seq, message.audioBase64);
          break;

        case 'tts_audio_end':
          streamingActiveRef.current = false;
          playerRef.current?.endStream(message.reason);
          break;

        case 'tts_audio':
          streamingActiveRef.current = true;
          setState((prev) => ({ ...prev, status: 'speaking' }));
          serviceRef.current?.pauseRecorder();
          playerRef.current?.beginStream();
          void playerRef.current?.addChunk(0, message.audioBase64);
          streamingActiveRef.current = false;
          playerRef.current?.endStream('ok');
          break;

        case 'agent_reply': {
          const text = message.text.trim();
          setState((prev) => ({
            ...prev,
            sessionId: message.sessionId ?? prev.sessionId,
            messages: text
              ? [
                  ...prev.messages,
                  { id: makeId(), role: 'assistant', text, createdAt: Date.now() },
                ]
              : prev.messages,
          }));
          break;
        }

        case 'interrupt_ack':
          interruptPendingRef.current = false;
          streamingActiveRef.current = false;
          setState((prev) => ({ ...prev, status: 'listening' }));
          break;

        case 'warning':
          streamingActiveRef.current = false;
          interruptPendingRef.current = false;
          playerRef.current?.cancel();
          serviceRef.current?.resumeRecorder();
          setState((prev) => ({
            ...prev,
            status: prev.status === 'speaking' || prev.status === 'thinking' ? 'listening' : prev.status,
          }));
          break;

        case 'error':
          streamingActiveRef.current = false;
          interruptPendingRef.current = false;
          playerRef.current?.cancel();
          serviceRef.current?.resumeRecorder();
          setState((prev) => ({
            ...prev,
            status: 'error',
            inlineError: message.text ?? message.message ?? 'Voice error from backend.',
          }));
          break;

        case 'terminated':
          streamingActiveRef.current = false;
          interruptPendingRef.current = false;
          playerRef.current?.cancel();
          serviceRef.current?.resumeRecorder();
          break;

        case 'session_state':
          // Server-side state machine is informational; UI status is derived
          // from the more specific transcript/turn/tts events above.
          break;
      }
    },
    [interruptAgent],
  );

  const teardown = useCallback(async () => {
    streamingActiveRef.current = false;
    interruptPendingRef.current = false;
    playerRef.current?.dispose();
    playerRef.current = null;
    await serviceRef.current?.stop();
    serviceRef.current = null;
  }, []);

  const joinLive = useCallback(async () => {
    if (!DYNAMIS_JWT.trim() && !ALLOW_EMPTY_TOKEN) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        inlineError: 'noToken',
      }));
      return;
    }

    const sessionId = makeId();
    await teardown();
    setState({
      ...INITIAL_STATE,
      status: 'connecting',
      sessionId,
    });

    const player = new StreamingTtsPlayer({ onStateChange: handleTtsPlayerState });
    const service = new VoiceService({
      onMessage: handleMessage,
      onClose: () => {
        setState((prev) =>
          prev.status === 'idle' || prev.status === 'ended' ? prev : { ...prev, status: 'connecting' },
        );
      },
      onError: (error) => {
        setState((prev) => ({
          ...prev,
          status: 'error',
          inlineError: error,
        }));
      },
    });
    playerRef.current = player;
    serviceRef.current = service;

    try {
      await service.start({ sessionId, token: DYNAMIS_JWT });
    } catch (err) {
      await teardown();
      const message = err instanceof Error ? err.message : String(err);
      const code = /denied|NotAllowed|Permission/i.test(message) ? 'micDenied' : message;
      setState({
        ...INITIAL_STATE,
        status: 'error',
        inlineError: code,
      });
    }
  }, [handleMessage, handleTtsPlayerState, teardown]);

  const endLive = useCallback(async () => {
    await teardown();
    setState((prev) => ({
      ...INITIAL_STATE,
      status: 'ended',
      messages: prev.messages,
      sessionId: prev.sessionId,
      isMicOn: false,
    }));
  }, [teardown]);

  const toggleMic = useCallback(() => {
    setState((prev) => {
      const next = !prev.isMicOn;
      if (next) {
        serviceRef.current?.resumeRecorder();
      } else {
        serviceRef.current?.pauseRecorder();
      }
      return { ...prev, isMicOn: next };
    });
  }, []);

  const resetSession = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  useEffect(() => {
    return () => {
      void teardown();
    };
  }, [teardown]);

  return useMemo(
    () => ({
      status: state.status,
      isMicOn: state.isMicOn,
      partialTranscript: state.partialTranscript,
      inlineError: state.inlineError,
      messages: state.messages,
      sessionId: state.sessionId,
      isLive:
        state.status === 'ready' ||
        state.status === 'listening' ||
        state.status === 'thinking' ||
        state.status === 'speaking',
      isConnecting: state.status === 'connecting',
      joinLive,
      endLive,
      toggleMic,
      resetSession,
    }),
    [state, joinLive, endLive, toggleMic, resetSession],
  );
}

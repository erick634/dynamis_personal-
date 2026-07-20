import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ALLOW_EMPTY_TOKEN, API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';
import { acquireScreenWakeLock, type ScreenWakeLockHandle } from '@/features/live/screen-wake-lock';
import { StreamingTtsPlayer, type TtsPlaybackState } from '@/features/live/streaming-tts-player';
import { VoiceService } from '@/features/live/voice-service';
import type { VoiceServerMessage } from '@/features/live/voice-protocol';
import { useCurrentUser } from '@/stores/current-user';

export type LiveSessionKind = 'voice' | 'text';

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
  const user = useCurrentUser((state) => state.user);
  const [state, setState] = useState<LiveSessionState>(INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;
  const userRef = useRef(user);
  userRef.current = user;

  const serviceRef = useRef<VoiceService | null>(null);
  const playerRef = useRef<StreamingTtsPlayer | null>(null);
  const wakeLockRef = useRef<ScreenWakeLockHandle | null>(null);
  const streamingActiveRef = useRef(false);
  const interruptPendingRef = useRef(false);
  const sessionKindRef = useRef<LiveSessionKind | null>(null);
  const intentionalTeardownRef = useRef(false);

  const interruptAgent = useCallback(() => {
    const current = stateRef.current.status;
    if (interruptPendingRef.current) return;
    if (current !== 'speaking' && current !== 'thinking') return;

    interruptPendingRef.current = true;
    streamingActiveRef.current = false;
    playerRef.current?.cancel();
    // Resume STT immediately so the interrupting utterance is captured.
    serviceRef.current?.resumeRecorder();
    serviceRef.current?.sendMessage({ type: 'interrupt' });
  }, []);

  const handleTtsPlayerState = useCallback((playback: TtsPlaybackState) => {
    if (sessionKindRef.current !== 'voice') return;
    if (playback !== 'drained') return;
    if (streamingActiveRef.current) return;
    // Interrupt already resumed the mic and is waiting on interrupt_ack.
    if (interruptPendingRef.current) return;
    if (stateRef.current.status === 'listening') return;
    serviceRef.current?.resumeRecorder();
    setState((prev) => {
      if (
        prev.status !== 'speaking' &&
        prev.status !== 'thinking' &&
        prev.status !== 'connecting'
      ) {
        return prev;
      }
      return { ...prev, status: 'ready' };
    });
  }, []);

  const handleMessage = useCallback(
    (message: VoiceServerMessage) => {
      if (sessionKindRef.current !== 'voice') return;

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
          // Keep mic open for local VAD; do not forward PCM to STT until barge-in.
          serviceRef.current?.enableBargeInListen();
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
          serviceRef.current?.enableBargeInListen();
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
              ? [...prev.messages, { id: makeId(), role: 'assistant', text, createdAt: Date.now() }]
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
            status:
              prev.status === 'speaking' || prev.status === 'thinking' ? 'listening' : prev.status,
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
    intentionalTeardownRef.current = true;
    streamingActiveRef.current = false;
    interruptPendingRef.current = false;
    const wakeLock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (wakeLock) {
      await wakeLock.release();
    }
    playerRef.current?.dispose();
    playerRef.current = null;
    await serviceRef.current?.stop();
    serviceRef.current = null;
    intentionalTeardownRef.current = false;
  }, []);

  const beginVoiceSession = useCallback(
    async (options?: { sessionId?: string; preserveMessages?: boolean }) => {
      if (!user) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          inlineError: 'noUser',
        }));
        return;
      }

      if (!DYNAMIS_JWT.trim() && !ALLOW_EMPTY_TOKEN) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          inlineError: 'noToken',
        }));
        return;
      }

      const sessionId = options?.sessionId ?? makeId();
      const preservedMessages = options?.preserveMessages ? stateRef.current.messages : [];

      sessionKindRef.current = 'voice';
      await teardown();
      setState({
        ...INITIAL_STATE,
        status: 'connecting',
        sessionId,
        messages: preservedMessages,
      });

      const player = new StreamingTtsPlayer({ onStateChange: handleTtsPlayerState });
      const service = new VoiceService({
        onMessage: handleMessage,
        onBargeIn: () => {
          interruptAgent();
        },
        onClose: () => {
          if (intentionalTeardownRef.current || sessionKindRef.current !== 'voice') return;
          setState((prev) =>
            prev.status === 'idle' || prev.status === 'ended'
              ? prev
              : { ...prev, status: 'connecting' },
          );
        },
        onError: (error) => {
          if (sessionKindRef.current !== 'voice') return;
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
        await service.start({ sessionId, token: DYNAMIS_JWT, userId: user.userId });
        wakeLockRef.current = await acquireScreenWakeLock();
      } catch (err) {
        sessionKindRef.current = null;
        await teardown();
        const message = err instanceof Error ? err.message : String(err);
        const code = /denied|NotAllowed|Permission/i.test(message) ? 'micDenied' : message;
        setState({
          ...INITIAL_STATE,
          status: 'error',
          inlineError: code,
        });
      }
    },
    [user, handleMessage, handleTtsPlayerState, interruptAgent, teardown],
  );

  const joinLive = useCallback(async () => {
    await beginVoiceSession();
  }, [beginVoiceSession]);

  const switchToVoice = useCallback(async () => {
    const sessionId = stateRef.current.sessionId;
    if (!sessionId) {
      await beginVoiceSession();
      return;
    }
    await beginVoiceSession({ sessionId, preserveMessages: true });
  }, [beginVoiceSession]);

  const startTextSession = useCallback(async () => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        inlineError: 'noUser',
      }));
      return;
    }

    if (!DYNAMIS_JWT.trim() && !ALLOW_EMPTY_TOKEN) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        inlineError: 'noToken',
      }));
      return;
    }

    const sessionId = makeId();
    sessionKindRef.current = 'text';
    await teardown();
    setState({
      ...INITIAL_STATE,
      status: 'ready',
      sessionId,
      isMicOn: false,
    });
  }, [user, teardown]);

  const endLive = useCallback(async () => {
    sessionKindRef.current = null;
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
    if (sessionKindRef.current !== 'voice') return;
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
    sessionKindRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  const sendTextMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    const currentUser = userRef.current;
    const sessionId = stateRef.current.sessionId;

    if (!trimmed || !currentUser || !sessionId) {
      return;
    }

    setState((prev) => ({
      ...prev,
      inlineError: null,
      messages: [
        ...prev.messages,
        { id: makeId(), role: 'user', text: trimmed, createdAt: Date.now() },
      ],
    }));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (DYNAMIS_JWT.trim()) {
      headers.Authorization = `Bearer ${DYNAMIS_JWT}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: currentUser.userId,
          session_id: sessionId,
          message: trimmed,
        }),
      });

      if (!response.ok) {
        throw new Error(`POST /chat failed with status ${String(response.status)}`);
      }

      const data = (await response.json()) as { reply?: string };
      const reply = data.reply?.trim() ?? '';

      if (reply) {
        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages,
            { id: makeId(), role: 'assistant', text: reply, createdAt: Date.now() },
          ],
        }));
      }
    } catch (error) {
      // eslint-disable-next-line no-console -- text send failure; voice session stays live
      console.error('Live /chat error:', error);
      setState((prev) => ({ ...prev, inlineError: 'textSendFailed' }));
    }
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
      startTextSession,
      switchToVoice,
      endLive,
      toggleMic,
      resetSession,
      sendTextMessage,
    }),
    [
      state,
      joinLive,
      startTextSession,
      switchToVoice,
      endLive,
      toggleMic,
      resetSession,
      sendTextMessage,
    ],
  );
}

/**
 * Discovery session — prepared for LiveKit integration (rule 13).
 *
 * Real-time flow: POST /api/livekit/token → join room → listen for LiveKitDataEvent
 * on the data channel (`lib/livekit.ts`: agent.message, agent.thinking, profile.signal).
 * Do not duplicate agent logic in the frontend.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  DiscoveryMessage,
  DiscoverySessionMode,
  ProfileSignals,
} from '@/features/discovery/discovery-types';
import {
  fetchDiscoverySignals,
  parseChatSignalsPayload,
} from '@/features/discovery/discovery-signals-api';
import {
  boostSignalsFromUserMessages,
  deriveInsightFromMessages,
  deriveProfileSignalsFromIntentProfile,
} from '@/features/discovery/derive-profile-signals';
import {
  fetchReflectionSummary,
  messagesForReflectionSummary,
  type ReflectionSummary,
} from '@/features/discovery/reflection-summary-api';
import { useDiscoveryVoice } from '@/features/discovery/use-discovery-voice';
import { saveReflectionDidToday } from '@/features/transformation-plan/reflection-today-storage';
import { useIntentProfile } from '@/features/you/use-intent-profile';
import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';
import { useCurrentUser } from '@/stores/current-user';
import type { ProfileDimension } from '@/types/intent-profile';

const EMPTY_SIGNALS: ProfileSignals = {
  values: 8,
  mission: 8,
  strengths: 8,
  constraints: 8,
};

const DISCOVERY_MESSAGE_KEYS = [{ role: 'agent' as const, contentKey: 'discovery.greeting' }];

const REFLECTION_GREETING_KEY = 'dailyReflection.greeting';

const PROFILE_REFRESH_AFTER_CHAT_MS = 4500;

function buildDiscoveryMessages(instanceId: string): DiscoveryMessage[] {
  return DISCOVERY_MESSAGE_KEYS.map((item, index) => ({
    id: `${instanceId}-seed-${String(index)}`,
    role: item.role,
    contentKey: item.contentKey,
  }));
}

function buildReflectionMessages(instanceId: string): DiscoveryMessage[] {
  return [
    {
      id: `${instanceId}-reflection-0`,
      role: 'agent',
      contentKey: REFLECTION_GREETING_KEY,
    },
  ];
}

function buildInitialMessages(instanceId: string, mode: DiscoverySessionMode): DiscoveryMessage[] {
  return mode === 'reflection'
    ? buildReflectionMessages(instanceId)
    : buildDiscoveryMessages(instanceId);
}

export function useDiscoverySession(mode: DiscoverySessionMode = 'discovery') {
  const { t } = useTranslation();
  const instanceId = useId();
  const userId = useCurrentUser((state) => state.user?.userId);
  const displayName = useCurrentUser((state) => state.user?.displayName);
  const { profile } = useIntentProfile();
  const sessionIdRef = useRef<string | null>(null);
  const profileRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [messages, setMessages] = useState<DiscoveryMessage[]>(() =>
    buildInitialMessages(instanceId, mode),
  );
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [profileSignals, setProfileSignals] = useState<ProfileSignals>(EMPTY_SIGNALS);
  const [insightQuote, setInsightQuote] = useState('');
  const [reflectionSummary, setReflectionSummary] = useState<ReflectionSummary | null>(null);
  const sendMessageRef = useRef<(text: string) => void>(() => {});
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const userTexts = useMemo(
    () =>
      messages
        .filter((message) => message.role === 'user')
        .map((message) => message.text?.trim() ?? '')
        .filter((text) => text.length > 0),
    [messages],
  );

  const userMessageCount = userTexts.length;

  const resolveMessageText = useCallback(
    (message: DiscoveryMessage): string => {
      if (message.text) {
        return message.text;
      }
      if (message.contentKey) {
        return t(message.contentKey, {
          name: displayName?.trim() || t('discovery.greetingFallbackName'),
        });
      }
      return '';
    },
    [displayName, t],
  );

  const applySignalsLocally = useCallback(() => {
    const base = deriveProfileSignalsFromIntentProfile(profile);
    const boosted = boostSignalsFromUserMessages(base, userTexts);
    setProfileSignals(boosted);
    setInsightQuote(
      deriveInsightFromMessages(
        userTexts,
        profile,
        t(
          mode === 'reflection' ? 'dailyReflection.insight.fallback' : 'discovery.insight.fallback',
        ),
      ),
    );
  }, [mode, profile, t, userTexts]);

  const refreshSignalsFromServer = useCallback(async () => {
    if (!userId) {
      applySignalsLocally();
      return;
    }

    const payload = await fetchDiscoverySignals(userId);
    if (payload) {
      setProfileSignals(payload.profile_signals);
      setInsightQuote(payload.insight);
      return;
    }

    applySignalsLocally();
  }, [applySignalsLocally, userId]);

  useEffect(() => {
    void refreshSignalsFromServer();
  }, [refreshSignalsFromServer]);

  useEffect(() => {
    return () => {
      if (profileRefreshTimerRef.current) {
        clearTimeout(profileRefreshTimerRef.current);
      }
    };
  }, []);

  const scheduleProfileRefresh = useCallback(() => {
    if (profileRefreshTimerRef.current) {
      clearTimeout(profileRefreshTimerRef.current);
    }
    profileRefreshTimerRef.current = setTimeout(() => {
      void refreshSignalsFromServer();
    }, PROFILE_REFRESH_AFTER_CHAT_MS);
  }, [refreshSignalsFromServer]);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      const userMessage: DiscoveryMessage = {
        id: `${instanceId}-user-${String(Date.now())}`,
        role: 'user',
        text: trimmed,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsAgentThinking(true);

      const nextUserTexts = [...userTexts, trimmed];
      const optimisticBase = deriveProfileSignalsFromIntentProfile(profile);
      setProfileSignals(boostSignalsFromUserMessages(optimisticBase, nextUserTexts));
      setInsightQuote(
        deriveInsightFromMessages(
          nextUserTexts,
          profile,
          t(
            mode === 'reflection'
              ? 'dailyReflection.insight.fallback'
              : 'discovery.insight.fallback',
          ),
        ),
      );

      if (!userId) {
        setIsAgentThinking(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `${instanceId}-agent-${String(Date.now())}`,
            role: 'agent',
            text: "Your profile isn't set up yet — create one before starting Discovery.",
          },
        ]);
        return;
      }

      const runChatTurn = async (): Promise<void> => {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (DYNAMIS_JWT.trim()) {
            headers.Authorization = `Bearer ${DYNAMIS_JWT}`;
          }

          const requestBody: Record<string, string> = {
            user_id: userId,
            message: trimmed,
          };
          if (sessionIdRef.current) {
            requestBody.session_id = sessionIdRef.current;
          }

          const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            throw new Error(`POST /chat failed with status ${String(response.status)}`);
          }

          const data = (await response.json()) as {
            reply?: string;
            session_id?: string;
            profile_signals?: ProfileSignals;
            insight?: string;
          };
          if (data.session_id) {
            sessionIdRef.current = data.session_id;
          }

          const signalsPayload = parseChatSignalsPayload(data);
          if (signalsPayload) {
            setProfileSignals(signalsPayload.profile_signals);
            setInsightQuote(signalsPayload.insight);
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `${instanceId}-agent-${String(Date.now())}`,
              role: 'agent',
              text: data.reply ?? '…',
            },
          ]);

          scheduleProfileRefresh();
        } catch (error) {
          // eslint-disable-next-line no-console -- surfaced for local debugging of backend chat integration
          console.error('Discovery /chat error:', error);
          setMessages((prev) => [
            ...prev,
            {
              id: `${instanceId}-agent-${String(Date.now())}`,
              role: 'agent',
              text: 'Sorry, I had trouble responding just now. Please try again.',
            },
          ]);
        } finally {
          setIsAgentThinking(false);
        }
      };

      void runChatTurn();
    },
    [instanceId, mode, profile, scheduleProfileRefresh, t, userId, userTexts],
  );

  sendMessageRef.current = sendMessage;

  const { isVoiceActive, partialTranscript, voiceError, startVoice, stopVoice } = useDiscoveryVoice(
    {
      userId,
      isDisabled: isAgentThinking,
      onFinalTranscript: (text) => {
        sendMessageRef.current(text);
      },
    },
  );

  const finishReflection = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsGeneratingSummary(true);

    const apiMessages = messagesForReflectionSummary(messages, resolveMessageText);
    const summary = (await fetchReflectionSummary(userId, apiMessages)) ?? {
      did_today: [],
      plan_tomorrow: [],
      celebration: t('dailyReflection.summary.fallbackCelebration'),
    };

    if (summary.did_today.length > 0) {
      saveReflectionDidToday(userId, summary.did_today);
    }

    setReflectionSummary(summary);
    setIsGeneratingSummary(false);
  }, [messages, resolveMessageText, t, userId]);

  const applyProfileSignal = useCallback((dimension: ProfileDimension, delta: number) => {
    setProfileSignals((prev) => ({
      ...prev,
      [dimension]: Math.min(100, Math.max(0, prev[dimension] + delta)),
    }));
  }, []);

  const resolvedInsight =
    insightQuote.trim().length > 0
      ? insightQuote
      : t(
          mode === 'reflection' ? 'dailyReflection.insight.fallback' : 'discovery.insight.fallback',
        );

  return {
    mode,
    messages,
    isAgentThinking,
    profileSignals,
    isVoiceActive,
    partialTranscript,
    voiceError,
    insightQuote: resolvedInsight,
    reflectionSummary,
    isGeneratingSummary,
    userMessageCount,
    sendMessage,
    finishReflection,
    startVoice,
    stopVoice,
    applyProfileSignal,
  };
}

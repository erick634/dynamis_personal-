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
import { fetchDiscoverySignals } from '@/features/discovery/discovery-signals-api';
import { runDiscoveryChatTurn } from '@/features/discovery/run-discovery-chat-turn';
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
import type { LifeAreaGoalSuggestion } from '@/features/intent-profile/use-life-area-goals';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import { useIntentProfile } from '@/features/you/use-intent-profile';
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
  const [pendingGoalSuggestion, setPendingGoalSuggestion] = useState<LifeAreaGoalSuggestion | null>(
    null,
  );
  const applySuggestion = useLifeAreaGoals((state) => state.applySuggestion);
  const sendMessageRef = useRef<
    (text: string, options?: { skipUserAppend?: boolean; userIdOverride?: string }) => void
  >(() => {});
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

  const holdForIdentity = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${instanceId}-user-${String(Date.now())}`,
          role: 'user',
          text: trimmed,
        },
        {
          id: `${instanceId}-agent-identity-${String(Date.now())}`,
          role: 'agent',
          contentKey: 'discovery.identity.promptBubble',
        },
      ]);

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
    },
    [instanceId, mode, profile, t, userTexts],
  );

  /** Opens the identity ask without a pending user utterance (Speak / mic). */
  const promptForIdentity = useCallback(() => {
    setMessages((prev) => {
      const alreadyPrompted = prev.some(
        (message) => message.contentKey === 'discovery.identity.promptBubble',
      );
      if (alreadyPrompted) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `${instanceId}-agent-identity-${String(Date.now())}`,
          role: 'agent',
          contentKey: 'discovery.identity.promptBubble',
        },
      ];
    });
  }, [instanceId]);

  const sendMessage = useCallback(
    (
      text: string,
      options?: {
        skipUserAppend?: boolean;
        userIdOverride?: string;
      },
    ) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      const effectiveUserId = options?.userIdOverride ?? userId;

      if (!options?.skipUserAppend) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${instanceId}-user-${String(Date.now())}`,
            role: 'user',
            text: trimmed,
          },
        ]);

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
      }

      setIsAgentThinking(true);

      if (!effectiveUserId) {
        setIsAgentThinking(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `${instanceId}-agent-${String(Date.now())}`,
            role: 'agent',
            contentKey: 'discovery.identity.promptBubble',
          },
        ]);
        return;
      }

      const runChatTurn = async (): Promise<void> => {
        try {
          const data = await runDiscoveryChatTurn({
            userId: effectiveUserId,
            message: trimmed,
            sessionId: sessionIdRef.current,
          });

          if (data.sessionId) {
            sessionIdRef.current = data.sessionId;
          }

          if (data.profileSignals) {
            setProfileSignals(data.profileSignals);
          }
          if (data.insight) {
            setInsightQuote(data.insight);
          }
          if (data.lifeAreaGoalSuggestion) {
            setPendingGoalSuggestion(data.lifeAreaGoalSuggestion);
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `${instanceId}-agent-${String(Date.now())}`,
              role: 'agent',
              text: data.reply,
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

  const appendLiveUserUtterance = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `${instanceId}-user-${String(Date.now())}`,
          role: 'user',
          text: trimmed,
        },
      ]);
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
    },
    [instanceId, mode, profile, t, userTexts],
  );

  const appendLiveAgentReply = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      setIsAgentThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `${instanceId}-agent-${String(Date.now())}`,
          role: 'agent',
          text: trimmed,
        },
      ]);
      scheduleProfileRefresh();
    },
    [instanceId, scheduleProfileRefresh],
  );

  const {
    isVoiceActive,
    isConnecting,
    voiceStatus,
    partialTranscript,
    voiceError,
    startVoice,
    stopVoice,
  } = useDiscoveryVoice({
    userId,
    isDisabled: false,
    getSessionId: () => sessionIdRef.current,
    onSessionId: (sessionId) => {
      sessionIdRef.current = sessionId;
    },
    onFinalTranscript: (text) => {
      sendMessageRef.current(text);
    },
    onLiveUserUtterance: appendLiveUserUtterance,
    onLiveAgentReply: appendLiveAgentReply,
  });

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

  const startNewChat = useCallback(() => {
    sessionIdRef.current = null;
    setMessages(buildInitialMessages(instanceId, mode));
    setIsAgentThinking(false);
    setReflectionSummary(null);
    setPendingGoalSuggestion(null);
    setIsGeneratingSummary(false);
  }, [instanceId, mode]);

  const loadSession = useCallback(
    (
      sessionId: string,
      sessionMessages: { role: 'user' | 'agent'; text: string; id: string }[],
    ) => {
      sessionIdRef.current = sessionId;
      setMessages(
        sessionMessages
          .filter((message) => !message.text.startsWith('[Voice session'))
          .map((message) => ({
            id: message.id,
            role: message.role,
            text: message.text,
          })),
      );
      setIsAgentThinking(false);
      setReflectionSummary(null);
      setPendingGoalSuggestion(null);
      setIsGeneratingSummary(false);
    },
    [],
  );

  const applyProfileSignal = useCallback((dimension: ProfileDimension, delta: number) => {
    setProfileSignals((prev) => ({
      ...prev,
      [dimension]: Math.min(100, Math.max(0, prev[dimension] + delta)),
    }));
  }, []);

  const acceptGoalSuggestion = useCallback(() => {
    if (!pendingGoalSuggestion) {
      return;
    }
    applySuggestion(pendingGoalSuggestion);
    setPendingGoalSuggestion(null);
  }, [applySuggestion, pendingGoalSuggestion]);

  const dismissGoalSuggestion = useCallback(() => {
    setPendingGoalSuggestion(null);
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
    isConnecting,
    voiceStatus,
    partialTranscript,
    voiceError,
    insightQuote: resolvedInsight,
    reflectionSummary,
    isGeneratingSummary,
    userMessageCount,
    sessionId: sessionIdRef.current,
    profile,
    pendingGoalSuggestion,
    sendMessage,
    holdForIdentity,
    promptForIdentity,
    finishReflection,
    startNewChat,
    loadSession,
    startVoice,
    stopVoice,
    applyProfileSignal,
    acceptGoalSuggestion,
    dismissGoalSuggestion,
  };
}

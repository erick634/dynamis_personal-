/**
 * Discovery session — prepared for LiveKit integration (rule 13).
 *
 * Real-time flow: POST /api/livekit/token → join room → listen for LiveKitDataEvent
 * on the data channel (`lib/livekit.ts`: agent.message, agent.thinking, profile.signal).
 * Do not duplicate agent logic in the frontend.
 */
import { useCallback, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  DiscoveryMessage,
  DiscoverySessionMode,
  ProfileSignals,
} from '@/features/discovery/discovery-types';
import type { ProfileDimension } from '@/types/intent-profile';

const INITIAL_SIGNALS: ProfileSignals = {
  values: 78,
  mission: 62,
  strengths: 45,
  constraints: 30,
};

const DISCOVERY_MESSAGE_KEYS = [
  { role: 'agent' as const, contentKey: 'discovery.mockMessages.greeting' },
  { role: 'user' as const, contentKey: 'discovery.mockMessages.userClimate' },
  { role: 'agent' as const, contentKey: 'discovery.mockMessages.followUp' },
];

const REFLECTION_QUESTION_KEYS = [
  'dailyReflection.questions.q1',
  'dailyReflection.questions.q2',
  'dailyReflection.questions.q3',
] as const;

const REFLECTION_USER_RESPONSES_FOR_COMPLETION = 3;

function buildDiscoveryMessages(instanceId: string): DiscoveryMessage[] {
  return DISCOVERY_MESSAGE_KEYS.map((item, index) => ({
    id: `${instanceId}-seed-${String(index)}`,
    role: item.role,
    contentKey: item.contentKey,
  }));
}

function buildReflectionMessages(instanceId: string): DiscoveryMessage[] {
  return REFLECTION_QUESTION_KEYS.map((contentKey, index) => ({
    id: `${instanceId}-reflection-${String(index)}`,
    role: 'agent',
    contentKey,
  }));
}

function buildInitialMessages(instanceId: string, mode: DiscoverySessionMode): DiscoveryMessage[] {
  return mode === 'reflection'
    ? buildReflectionMessages(instanceId)
    : buildDiscoveryMessages(instanceId);
}

export function useDiscoverySession(mode: DiscoverySessionMode = 'discovery') {
  const { t } = useTranslation();
  const instanceId = useId();
  const reflectionCompletedRef = useRef(false);

  const [messages, setMessages] = useState<DiscoveryMessage[]>(() =>
    buildInitialMessages(instanceId, mode),
  );
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [profileSignals, setProfileSignals] = useState<ProfileSignals>(INITIAL_SIGNALS);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [userReflectionResponses, setUserReflectionResponses] = useState(0);

  const completeReflection = useCallback(() => {
    if (reflectionCompletedRef.current) {
      return;
    }
    reflectionCompletedRef.current = true;
    // eslint-disable-next-line no-console -- TODO(backend): journal entry + energeia.realized / journal.completed
    console.warn('TODO: append journal entry, possibly trigger energeia.realized', {
      event: 'journal.completed',
    });
  }, []);

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

      if (mode === 'reflection') {
        const nextCount = userReflectionResponses + 1;
        setUserReflectionResponses(nextCount);

        // TODO(livekit): publish user utterance on data channel / audio track instead of mock timeout
        window.setTimeout(() => {
          setIsAgentThinking(false);
          if (nextCount >= REFLECTION_USER_RESPONSES_FOR_COMPLETION) {
            completeReflection();
            setMessages((prev) => [
              ...prev,
              {
                id: `${instanceId}-agent-${String(Date.now())}`,
                role: 'agent',
                contentKey: 'dailyReflection.mockMessages.closing',
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: `${instanceId}-agent-${String(Date.now())}`,
                role: 'agent',
                contentKey: 'dailyReflection.mockMessages.ack',
              },
            ]);
          }
        }, 900);
        return;
      }

      // TODO(livekit): publish user utterance on data channel / audio track instead of mock timeout
      window.setTimeout(() => {
        setIsAgentThinking(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `${instanceId}-agent-${String(Date.now())}`,
            role: 'agent',
            contentKey: 'discovery.mockMessages.agentReply',
          },
        ]);
        setProfileSignals((prev) => ({
          ...prev,
          values: Math.min(100, prev.values + 2),
        }));
      }, 900);
    },
    [completeReflection, instanceId, mode, userReflectionResponses],
  );

  const startVoice = useCallback(() => {
    setIsVoiceActive(true);
    // TODO(livekit): fetchLiveKitToken(userId, roomName) → Room.connect → enable microphone
    // TODO(livekit): subscribe to RoomEvent.DataReceived → parseLiveKitDataEvent(payload)
  }, []);

  const stopVoice = useCallback(() => {
    setIsVoiceActive(false);
    // TODO(livekit): room.localParticipant.setMicrophoneEnabled(false) and/or disconnect
  }, []);

  const applyProfileSignal = useCallback((dimension: ProfileDimension, delta: number) => {
    // TODO(livekit): call when profile.signal event arrives on data channel
    setProfileSignals((prev) => ({
      ...prev,
      [dimension]: Math.min(100, Math.max(0, prev[dimension] + delta)),
    }));
  }, []);

  const insightQuote =
    mode === 'reflection' ? t('dailyReflection.insight.quote') : t('discovery.insight.quote');

  return {
    mode,
    messages,
    isAgentThinking,
    profileSignals,
    isVoiceActive,
    insightQuote,
    sendMessage,
    startVoice,
    stopVoice,
    applyProfileSignal,
  };
}

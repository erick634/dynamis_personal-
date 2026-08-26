import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { BrandIcon } from '@/components/ui/brand-icon';
import { StarField } from '@/components/ui/star-field';
import { UnlockLoadingIndicator } from '@/components/ui/unlock-loading-indicator';
import { fetchChatSessionDetail } from '@/features/chat-history/chat-history-api';
import { EndTheDayButton } from '@/features/daily-reflection/end-the-day-button';
import { ReflectionPrompt } from '@/features/daily-reflection/reflection-prompt';
import { DiscoveryIdentityCard } from '@/features/discovery/discovery-identity-card';
import { DiscoveryInput } from '@/features/discovery/discovery-input';
import {
  DiscoveryIntentPicker,
  type ConversationIntent,
} from '@/features/discovery/discovery-intent-picker';
import {
  DiscoveryContinueProfilePicker,
  type ContinueProfileChoice,
} from '@/features/discovery/discovery-continue-profile-picker';
import { DiscoveryLiveStage } from '@/features/discovery/discovery-live-stage';
import { DiscoveryMessageBubble } from '@/features/discovery/discovery-message';
import type { DiscoverySessionMode } from '@/features/discovery/discovery-types';
import { LifeAreaGoalSuggestionCard } from '@/features/discovery/life-area-goal-suggestion-card';
import { ReflectionSummaryView } from '@/features/discovery/reflection-summary-view';
import { speakAgentLine, unlockAgentAudio } from '@/features/discovery/speak-agent-line';
import { useDiscoverySession } from '@/features/discovery/use-discovery-session';
import { useHyperspaceNavigate } from '@/hooks/use-hyperspace-navigate';
import { useCurrentUser, type CurrentUser } from '@/stores/current-user';

function resolveSessionMode(searchParams: URLSearchParams): DiscoverySessionMode {
  return searchParams.get('mode') === 'reflection' ? 'reflection' : 'discovery';
}

function hasIdentity(user: CurrentUser | null): boolean {
  return Boolean(user?.userId && user.email.trim() && user.displayName.trim());
}

function hasReturningProfile(
  profile: { roleContext?: string | null; aspirations?: string | null } | null,
): boolean {
  return Boolean(profile?.roleContext?.trim() || profile?.aspirations?.trim());
}

const INTENT_MESSAGE_KEYS: Record<Exclude<ConversationIntent, 'continueProfile'>, string> = {
  refine: 'discovery.intent.refine.message',
  newWatchtower: 'discovery.intent.newWatchtower.message',
  advance: 'discovery.intent.advance.message',
};

export function DiscoveryChat() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const hyperspaceNavigate = useHyperspaceNavigate();
  const user = useCurrentUser((state) => state.user);
  const mode = resolveSessionMode(searchParams);
  const isReflection = mode === 'reflection';
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isLiveStageOpen, setIsLiveStageOpen] = useState(false);
  const [isIdentityGateOpen, setIsIdentityGateOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [intentChosen, setIntentChosen] = useState(false);
  const [showContinueProfile, setShowContinueProfile] = useState(false);
  const sessionLoadRef = useRef<string | null>(null);
  const identitySpeechAbortRef = useRef<AbortController | null>(null);

  const {
    messages,
    isAgentThinking,
    isVoiceActive,
    voiceStatus,
    partialTranscript,
    voiceError,
    reflectionSummary,
    isGeneratingSummary,
    userMessageCount,
    profile,
    sendMessage,
    holdForIdentity,
    promptForIdentity,
    finishReflection,
    startNewChat,
    loadSession,
    startVoice,
    stopVoice,
    pendingGoalSuggestion,
    acceptGoalSuggestion,
    dismissGoalSuggestion,
  } = useDiscoverySession(mode);

  const showReflectionSummary = isReflection && reflectionSummary != null;
  const showEndCheckIn =
    isReflection && !showReflectionSummary && userMessageCount >= 2 && !isGeneratingSummary;
  const isFreshStart = userMessageCount === 0 && !showReflectionSummary && !isIdentityGateOpen;
  const greetingName = user?.displayName.trim() || t('discovery.greetingFallbackName');
  const identityReady = hasIdentity(user);
  const showIntentPicker =
    !isReflection &&
    isFreshStart &&
    identityReady &&
    hasReturningProfile(profile) &&
    !intentChosen &&
    !showContinueProfile;

  const openIdentityGate = (pendingText?: string) => {
    unlockAgentAudio();
    const trimmed = pendingText?.trim() ?? '';
    if (trimmed) {
      setPendingMessage(trimmed);
      holdForIdentity(trimmed);
    } else {
      promptForIdentity();
    }
    setIsIdentityGateOpen(true);
  };

  useEffect(() => {
    if (!isIdentityGateOpen) {
      identitySpeechAbortRef.current?.abort();
      identitySpeechAbortRef.current = null;
      return;
    }

    const spoken = t('discovery.identity.promptBubble');
    const controller = new AbortController();
    identitySpeechAbortRef.current?.abort();
    identitySpeechAbortRef.current = controller;

    void speakAgentLine(spoken, controller.signal).catch(() => {
      // Soft-fail: form still works if TTS is down.
    });

    return () => {
      controller.abort();
    };
  }, [isIdentityGateOpen, t, i18n.language]);

  useEffect(() => {
    const wantsNew = searchParams.get('new') === '1';
    if (!wantsNew) {
      return;
    }
    startNewChat();
    setIntentChosen(false);
    setShowContinueProfile(false);
    sessionLoadRef.current = null;
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    next.delete('session');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, startNewChat]);

  useEffect(() => {
    const sessionId = searchParams.get('session')?.trim() ?? '';
    if (!sessionId || !user?.userId || sessionLoadRef.current === sessionId) {
      return;
    }
    sessionLoadRef.current = sessionId;
    void (async () => {
      try {
        const detail = await fetchChatSessionDetail(user.userId, sessionId);
        loadSession(
          detail.session_id,
          detail.messages.map((message) => ({
            id: message.id,
            role: message.role,
            text: message.text,
          })),
        );
        setIntentChosen(true);
      } catch {
        sessionLoadRef.current = null;
      }
    })();
  }, [loadSession, searchParams, user?.userId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || isFreshStart) {
      return;
    }
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages, isAgentThinking, isGeneratingSummary, isFreshStart, isIdentityGateOpen]);

  const handleSendMessage = (text: string) => {
    if (!identityReady) {
      openIdentityGate(text);
      return;
    }
    setIntentChosen(true);
    sendMessage(text);
  };

  const handleIntentSelect = (intent: ConversationIntent) => {
    if (intent === 'continueProfile') {
      setShowContinueProfile(true);
      return;
    }
    setIntentChosen(true);
    sendMessage(t(INTENT_MESSAGE_KEYS[intent]));
  };

  const handleContinueProfileConfirm = (choice: ContinueProfileChoice) => {
    setShowContinueProfile(false);
    setIntentChosen(true);
    if (choice.kind === 'lifeArea') {
      sendMessage(
        t('discovery.intent.continueProfile.messageLifeArea', {
          area: t(`you.balanceRadar.areas.${choice.areaId}`),
        }),
      );
      return;
    }
    sendMessage(
      t('discovery.intent.continueProfile.messageProfile', {
        title: choice.title,
      }),
    );
  };

  const handleIdentityCompleted = (savedUser: CurrentUser) => {
    identitySpeechAbortRef.current?.abort();
    setIsIdentityGateOpen(false);
    const pending = pendingMessage?.trim() ?? null;
    setPendingMessage(null);
    if (pending) {
      sendMessage(pending, {
        skipUserAppend: true,
        userIdOverride: savedUser.userId,
      });
    }
  };

  const handleStartLive = () => {
    if (!identityReady) {
      openIdentityGate();
      return;
    }
    hyperspaceNavigate(null, () => {
      setIsLiveStageOpen(true);
      void startVoice('full');
    });
  };

  const handleCloseLive = () => {
    setIsLiveStageOpen(false);
    stopVoice();
  };

  return (
    <div className="relative -mb-24 flex min-h-dvh w-full min-w-0 flex-col overflow-hidden bg-transparent pb-24 font-body text-ink md:mb-0 md:h-dvh md:pb-0">
      <StarField className="z-0" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <h1 className="font-display text-lg font-semibold tracking-tight text-white md:text-xl">
            {isReflection ? t('dailyReflection.chat.title') : t('brand.name')}
          </h1>
          {!isReflection && identityReady ? <EndTheDayButton size="inline" /> : null}
        </header>

        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-3 pb-3 sm:px-6 md:pb-4">
          {showReflectionSummary ? (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-[20px] border border-line-soft bg-white/95 shadow-card">
              <ReflectionSummaryView
                summary={reflectionSummary}
                onDone={() => {
                  navigate('/plan');
                }}
              />
            </div>
          ) : (
            <>
              {isReflection ? (
                <div className="mb-3 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/90 shadow-soft backdrop-blur-sm">
                  <ReflectionPrompt />
                </div>
              ) : null}

              <div
                ref={messagesContainerRef}
                className="scrollbar-on-dark flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-2 sm:px-2"
                aria-live="polite"
                aria-relevant="additions"
                aria-label={
                  isReflection ? t('dailyReflection.messages.label') : t('discovery.messages.label')
                }
              >
                {isFreshStart && !isReflection ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
                    <span
                      className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20"
                      aria-hidden
                    >
                      <BrandIcon className="h-7 w-7" />
                    </span>
                    <p className="max-w-md font-display text-[clamp(1.5rem,5vw,2.25rem)] font-medium leading-tight tracking-tight text-white">
                      {t('discovery.empty.headline', { name: greetingName })}
                    </p>
                    <p className="mt-3 max-w-sm font-body text-sm text-white/70">
                      {t('discovery.empty.subtitle')}
                    </p>
                    {showIntentPicker ? (
                      <DiscoveryIntentPicker
                        disabled={isAgentThinking}
                        onSelect={handleIntentSelect}
                      />
                    ) : null}
                    {showContinueProfile ? (
                      <DiscoveryContinueProfilePicker
                        disabled={isAgentThinking}
                        onConfirm={handleContinueProfileConfirm}
                        onBack={() => {
                          setShowContinueProfile(false);
                        }}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="flex w-full flex-col gap-5 pb-4">
                    {isGeneratingSummary ? (
                      <UnlockLoadingIndicator
                        variant="on-dark"
                        label={t('dailyReflection.summary.generating')}
                      />
                    ) : (
                      <>
                        {messages.map((message) => (
                          <DiscoveryMessageBubble key={message.id} message={message} />
                        ))}
                        {isAgentThinking ? (
                          <UnlockLoadingIndicator
                            variant="on-dark"
                            label={t('discovery.thinking')}
                          />
                        ) : null}
                      </>
                    )}
                    {isIdentityGateOpen ? (
                      <div className="pt-2">
                        <DiscoveryIdentityCard onCompleted={handleIdentityCompleted} />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {!isGeneratingSummary && !isIdentityGateOpen ? (
                <div className="shrink-0">
                  {pendingGoalSuggestion ? (
                    <LifeAreaGoalSuggestionCard
                      suggestion={pendingGoalSuggestion}
                      onAccept={acceptGoalSuggestion}
                      onDismiss={dismissGoalSuggestion}
                    />
                  ) : null}
                  {showEndCheckIn ? (
                    <div className="mb-3 px-1">
                      <button
                        type="button"
                        disabled={isGeneratingSummary}
                        onClick={() => {
                          void finishReflection();
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/95 px-4 py-2.5 font-body text-sm font-medium text-ink shadow-soft transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4 text-blue" aria-hidden />
                        {t('dailyReflection.endCheckIn')}
                      </button>
                    </div>
                  ) : null}
                  <DiscoveryInput
                    isVoiceActive={isVoiceActive && !isLiveStageOpen}
                    isDisabled={isAgentThinking}
                    partialTranscript={isLiveStageOpen ? '' : partialTranscript}
                    voiceError={isLiveStageOpen ? null : voiceError}
                    onSendMessage={handleSendMessage}
                    onStartVoice={() => {
                      if (!identityReady) {
                        openIdentityGate();
                        return;
                      }
                      setIsLiveStageOpen(false);
                      void startVoice('stt_only');
                    }}
                    onStopVoice={stopVoice}
                    onStartLive={handleStartLive}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {isLiveStageOpen ? (
        <DiscoveryLiveStage
          voiceStatus={voiceStatus}
          partialTranscript={partialTranscript}
          voiceError={voiceError}
          onClose={handleCloseLive}
        />
      ) : null}
    </div>
  );
}

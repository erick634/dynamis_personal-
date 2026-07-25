import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { StarField } from '@/components/ui/star-field';
import { EndTheDayButton } from '@/features/daily-reflection/end-the-day-button';
import { ReflectionPrompt } from '@/features/daily-reflection/reflection-prompt';
import { DiscoveryIdentityCard } from '@/features/discovery/discovery-identity-card';
import { DiscoveryInput } from '@/features/discovery/discovery-input';
import { DiscoveryLiveStage } from '@/features/discovery/discovery-live-stage';
import { DiscoveryMessageBubble } from '@/features/discovery/discovery-message';
import type { DiscoverySessionMode } from '@/features/discovery/discovery-types';
import { ReflectionSummaryView } from '@/features/discovery/reflection-summary-view';
import { useDiscoverySession } from '@/features/discovery/use-discovery-session';
import { useCurrentUser, type CurrentUser } from '@/stores/current-user';

function resolveSessionMode(searchParams: URLSearchParams): DiscoverySessionMode {
  return searchParams.get('mode') === 'reflection' ? 'reflection' : 'discovery';
}

function hasIdentity(user: CurrentUser | null): boolean {
  return Boolean(user?.userId && user.email.trim() && user.displayName.trim());
}

export function DiscoveryChat() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useCurrentUser((state) => state.user);
  const mode = resolveSessionMode(searchParams);
  const isReflection = mode === 'reflection';
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isLiveStageOpen, setIsLiveStageOpen] = useState(false);
  const [isIdentityGateOpen, setIsIdentityGateOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

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
    sendMessage,
    holdForIdentity,
    finishReflection,
    startVoice,
    stopVoice,
  } = useDiscoverySession(mode);

  const showReflectionSummary = isReflection && reflectionSummary != null;
  const showEndCheckIn =
    isReflection && !showReflectionSummary && userMessageCount >= 2 && !isGeneratingSummary;
  const isFreshStart = userMessageCount === 0 && !showReflectionSummary && !isIdentityGateOpen;
  const greetingName = user?.displayName.trim() || t('discovery.greetingFallbackName');
  const identityReady = hasIdentity(user);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || isFreshStart) {
      return;
    }
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages, isAgentThinking, isGeneratingSummary, isFreshStart, isIdentityGateOpen]);

  const requestIdentity = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setPendingMessage(trimmed);
    holdForIdentity(trimmed);
    setIsIdentityGateOpen(true);
  };

  const handleSendMessage = (text: string) => {
    if (!identityReady) {
      requestIdentity(text);
      return;
    }
    sendMessage(text);
  };

  const handleIdentityCompleted = (savedUser: CurrentUser) => {
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
      setIsIdentityGateOpen(true);
      return;
    }
    setIsLiveStageOpen(true);
    void startVoice('full');
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
                      className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 font-display text-2xl font-semibold text-white ring-1 ring-white/20"
                      aria-hidden
                    >
                      D
                    </span>
                    <p className="max-w-md font-display text-[clamp(1.5rem,5vw,2.25rem)] font-medium leading-tight tracking-tight text-white">
                      {t('discovery.empty.headline', { name: greetingName })}
                    </p>
                    <p className="mt-3 max-w-sm font-body text-sm text-white/70">
                      {t('discovery.empty.subtitle')}
                    </p>
                  </div>
                ) : (
                  <div className="flex w-full flex-col gap-5 pb-4">
                    {isGeneratingSummary ? (
                      <p className="font-body text-sm text-white/70 italic" role="status">
                        {t('dailyReflection.summary.generating')}
                      </p>
                    ) : (
                      <>
                        {messages.map((message) => (
                          <DiscoveryMessageBubble key={message.id} message={message} />
                        ))}
                        {isAgentThinking ? (
                          <p className="font-body text-sm text-white/70 italic" role="status">
                            {t('discovery.thinking')}
                          </p>
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
                        setIsIdentityGateOpen(true);
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

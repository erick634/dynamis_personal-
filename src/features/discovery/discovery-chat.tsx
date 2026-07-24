import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { EndTheDayButton } from '@/features/daily-reflection/end-the-day-button';
import { ReflectionPrompt } from '@/features/daily-reflection/reflection-prompt';
import { DiscoveryInput } from '@/features/discovery/discovery-input';
import { DiscoveryMessageBubble } from '@/features/discovery/discovery-message';
import { DiscoverySidePanel } from '@/features/discovery/discovery-side-panel';
import type { DiscoverySessionMode } from '@/features/discovery/discovery-types';
import { ReflectionSummaryView } from '@/features/discovery/reflection-summary-view';
import { useDiscoverySession } from '@/features/discovery/use-discovery-session';

function resolveSessionMode(searchParams: URLSearchParams): DiscoverySessionMode {
  return searchParams.get('mode') === 'reflection' ? 'reflection' : 'discovery';
}

export function DiscoveryChat() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = resolveSessionMode(searchParams);
  const isReflection = mode === 'reflection';

  const {
    messages,
    isAgentThinking,
    profileSignals,
    isVoiceActive,
    partialTranscript,
    voiceError,
    insightQuote,
    reflectionSummary,
    isGeneratingSummary,
    userMessageCount,
    sendMessage,
    finishReflection,
    startVoice,
    stopVoice,
  } = useDiscoverySession(mode);

  const showReflectionSummary = isReflection && reflectionSummary != null;
  const showEndCheckIn =
    isReflection && !showReflectionSummary && userMessageCount >= 2 && !isGeneratingSummary;

  return (
    <div className="w-full min-w-0 bg-bg font-body text-ink">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold break-words text-ink md:text-3xl">
            {isReflection ? t('dailyReflection.chat.title') : t('discovery.title')}
          </h1>
          <p className="mt-1 max-w-2xl font-body text-sm break-words text-ink-2">
            {isReflection ? t('dailyReflection.chat.subtitle') : t('discovery.subtitle')}
          </p>
        </div>
        {!isReflection ? <EndTheDayButton /> : null}
      </header>

      <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <section className="flex min-h-[min(70vh,640px)] min-w-0 flex-col overflow-hidden rounded-[20px] border border-line-soft bg-white shadow-card">
          {showReflectionSummary ? (
            <ReflectionSummaryView
              summary={reflectionSummary}
              onDone={() => {
                navigate('/plan');
              }}
            />
          ) : (
            <>
              {isReflection ? <ReflectionPrompt /> : null}

              <div
                className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 md:px-6"
                aria-live="polite"
                aria-relevant="additions"
                aria-label={
                  isReflection ? t('dailyReflection.messages.label') : t('discovery.messages.label')
                }
              >
                {isGeneratingSummary ? (
                  <p className="font-body text-sm text-ink-3 italic" role="status">
                    {t('dailyReflection.summary.generating')}
                  </p>
                ) : (
                  <>
                    {messages.map((message) => (
                      <DiscoveryMessageBubble key={message.id} message={message} />
                    ))}
                    {isAgentThinking ? (
                      <p className="font-body text-sm text-ink-3 italic" role="status">
                        {t('discovery.thinking')}
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              {!isGeneratingSummary ? (
                <>
                  <DiscoveryInput
                    isVoiceActive={isVoiceActive}
                    isDisabled={isAgentThinking}
                    partialTranscript={partialTranscript}
                    voiceError={voiceError}
                    onSendMessage={sendMessage}
                    onStartVoice={() => {
                      void startVoice();
                    }}
                    onStopVoice={stopVoice}
                  />
                  {showEndCheckIn ? (
                    <div className="border-t border-line-soft bg-white px-4 pb-4 pt-3 md:px-6">
                      <button
                        type="button"
                        disabled={isGeneratingSummary}
                        onClick={() => {
                          void finishReflection();
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line-soft bg-bg px-4 py-2.5 font-body text-sm font-medium text-ink transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4 text-blue" aria-hidden />
                        {t('dailyReflection.endCheckIn')}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </section>

        <DiscoverySidePanel
          profileSignals={profileSignals}
          insightQuote={insightQuote}
          isUpdating={isAgentThinking}
        />
      </div>
    </div>
  );
}

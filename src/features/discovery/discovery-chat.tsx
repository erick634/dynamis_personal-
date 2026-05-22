import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { ReflectionPrompt } from '@/features/daily-reflection/reflection-prompt';
import { DiscoveryInput } from '@/features/discovery/discovery-input';
import { DiscoveryMessageBubble } from '@/features/discovery/discovery-message';
import { DiscoverySidePanel } from '@/features/discovery/discovery-side-panel';
import type { DiscoverySessionMode } from '@/features/discovery/discovery-types';
import { useDiscoverySession } from '@/features/discovery/use-discovery-session';

function resolveSessionMode(searchParams: URLSearchParams): DiscoverySessionMode {
  return searchParams.get('mode') === 'reflection' ? 'reflection' : 'discovery';
}

export function DiscoveryChat() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const mode = resolveSessionMode(searchParams);
  const isReflection = mode === 'reflection';

  const {
    messages,
    isAgentThinking,
    profileSignals,
    isVoiceActive,
    insightQuote,
    sendMessage,
    startVoice,
    stopVoice,
  } = useDiscoverySession(mode);

  return (
    <div className="min-h-dvh bg-bg font-body text-ink">
      <header className="border-b border-line-soft bg-white px-6 py-5">
        <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">
          {isReflection ? t('dailyReflection.chat.title') : t('discovery.title')}
        </h1>
        <p className="mt-1 max-w-2xl font-body text-sm text-ink-2">
          {isReflection ? t('dailyReflection.chat.subtitle') : t('discovery.subtitle')}
        </p>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_320px] md:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-[20px] border border-line-soft bg-white shadow-card">
          {isReflection ? <ReflectionPrompt /> : null}

          <div
            className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 md:px-6"
            aria-live="polite"
            aria-relevant="additions"
            aria-label={
              isReflection ? t('dailyReflection.messages.label') : t('discovery.messages.label')
            }
          >
            {messages.map((message) => (
              <DiscoveryMessageBubble key={message.id} message={message} />
            ))}
            {isAgentThinking ? (
              <p className="font-body text-sm text-ink-3 italic" role="status">
                {t('discovery.thinking')}
              </p>
            ) : null}
          </div>

          <DiscoveryInput
            isVoiceActive={isVoiceActive}
            isDisabled={isAgentThinking}
            onSendMessage={sendMessage}
            onStartVoice={startVoice}
            onStopVoice={stopVoice}
          />
        </section>

        <DiscoverySidePanel profileSignals={profileSignals} insightQuote={insightQuote} />
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';

import { LiveControls } from '@/features/live/live-controls';
import { LiveSidePanel } from '@/features/live/live-side-panel';
import { LiveTranscript } from '@/features/live/live-transcript';
import { LiveVideoStage } from '@/features/live/live-video-stage';
import { useLiveSession } from '@/features/live/use-live-session';

export function LiveScreen() {
  const { t } = useTranslation();
  const session = useLiveSession();

  return (
    <div className="min-h-dvh bg-bg font-body text-ink">
      <header className="border-b border-line-soft bg-white px-6 py-5">
        <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">{t('live.title')}</h1>
        <p className="mt-1 max-w-2xl font-body text-sm text-ink-2">{t('live.subtitle')}</p>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_320px] md:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-[20px] border border-line-soft bg-white shadow-card">
          <LiveVideoStage status={session.status} />
          <LiveTranscript messages={session.messages} partial={session.partialTranscript} />
          <LiveControls
            status={session.status}
            isMicOn={session.isMicOn}
            inlineError={session.inlineError}
            onJoin={() => {
              void session.joinLive();
            }}
            onEnd={() => {
              void session.endLive();
            }}
            onToggleMic={session.toggleMic}
            onReset={session.resetSession}
          />
        </section>

        <LiveSidePanel
          status={session.status}
          partialTranscript={session.partialTranscript}
          inlineError={session.inlineError}
          sessionId={session.sessionId}
        />
      </div>
    </div>
  );
}

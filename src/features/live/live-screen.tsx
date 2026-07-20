import { Send } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { LiveControls } from '@/features/live/live-controls';
import { LiveSidePanel } from '@/features/live/live-side-panel';
import { LiveTranscript } from '@/features/live/live-transcript';
import { LiveVideoStage } from '@/features/live/live-video-stage';
import { useLiveSession } from '@/features/live/use-live-session';
import { useCurrentUser } from '@/stores/current-user';

export function LiveScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser((state) => state.user);
  const session = useLiveSession();
  const [textInput, setTextInput] = useState('');
  const textInputId = useId();

  const controlsInlineError = session.inlineError === 'textSendFailed' ? null : session.inlineError;

  useEffect(() => {
    if (!user) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, navigate]);

  const handleSendText = () => {
    const value = textInput.trim();
    if (!value) return;
    void session.sendTextMessage(value);
    setTextInput('');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-dvh bg-bg font-body text-ink">
      <header className="border-b border-line-soft bg-white px-4 py-4 md:px-6 md:py-5">
        <h1 className="font-display text-2xl font-semibold text-ink md:text-3xl">
          {t('live.title')}
        </h1>
        <p className="mt-1 max-w-2xl font-body text-sm text-ink-2">{t('live.subtitle')}</p>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_320px] md:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-[20px] border border-line-soft bg-white shadow-card max-md:rounded-none max-md:border-x-0">
          <LiveVideoStage status={session.status} />
          <LiveTranscript messages={session.messages} partial={session.partialTranscript} />
          {session.isLive ? (
            <div className="flex shrink-0 flex-col gap-2 border-t border-line-soft bg-white px-4 py-3 md:px-6 md:py-4">
              {session.inlineError === 'textSendFailed' ? (
                <p role="alert" className="font-body text-xs text-red-deep md:text-sm">
                  {t('live.textInput.sendFailed')}
                </p>
              ) : null}
              <div className="flex items-center gap-3">
                <label htmlFor={textInputId} className="sr-only">
                  {t('live.textInput.placeholder')}
                </label>
                <input
                  id={textInputId}
                  type="text"
                  inputMode="text"
                  enterKeyHint="send"
                  autoComplete="off"
                  value={textInput}
                  onChange={(e) => {
                    setTextInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendText();
                    }
                  }}
                  placeholder={t('live.textInput.placeholder')}
                  className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-3 font-body text-base text-ink outline-none transition-colors placeholder:text-ink-3 focus-visible:border-blue-accent focus-visible:ring-2 focus-visible:ring-blue-soft"
                />
                <button
                  type="button"
                  onClick={handleSendText}
                  disabled={!textInput.trim()}
                  aria-label={t('live.textInput.send')}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg-soft text-blue transition-colors hover:bg-blue-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
          <LiveControls
            status={session.status}
            isMicOn={session.isMicOn}
            inlineError={controlsInlineError}
            onJoin={() => {
              void session.joinLive();
            }}
            onEnd={() => {
              void (async () => {
                await session.endLive();
                navigate('/watchtowers');
              })();
            }}
            onToggleMic={session.toggleMic}
            onReset={session.resetSession}
          />
        </section>

        <LiveSidePanel
          status={session.status}
          partialTranscript={session.partialTranscript}
          inlineError={controlsInlineError}
          sessionId={session.sessionId}
        />
      </div>
    </div>
  );
}

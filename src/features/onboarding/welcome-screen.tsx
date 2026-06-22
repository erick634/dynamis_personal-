import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { BrandMark } from '@/components/ui/brand-mark';
import type { LiveChatMessage, LiveSessionStatus } from '@/features/live/use-live-session';
import { useLiveSession } from '@/features/live/use-live-session';
import { useCurrentUser } from '@/stores/current-user';

import '@/features/awakening/awakening.css';

const ACTIVE_SESSION_STATUSES: ReadonlySet<LiveSessionStatus> = new Set([
  'connecting',
  'ready',
  'listening',
  'thinking',
  'speaking',
]);

function translateInlineError(t: (key: string) => string, value: string): string {
  if (value === 'noUser') {
    return t('live.inlineError.noUser');
  }
  if (
    value === 'noToken' ||
    value === 'micDenied' ||
    value === 'connection' ||
    value === 'backend'
  ) {
    return t(`live.errors.${value}`);
  }
  return value;
}

function sessionStatusLabel(t: (key: string) => string, status: LiveSessionStatus): string {
  switch (status) {
    case 'connecting':
      return t('live.stage.connecting');
    case 'ready':
      return t('live.stage.agentWaiting');
    case 'listening':
      return t('live.stage.listening');
    case 'thinking':
      return t('live.stage.thinking');
    case 'speaking':
      return t('live.stage.agentSpeaking');
    default:
      return '';
  }
}

type WelcomeInlineTranscriptProps = {
  messages: LiveChatMessage[];
  partial: string | null;
};

function WelcomeInlineTranscript({ messages, partial }: WelcomeInlineTranscriptProps) {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, partial]);

  const isEmpty = messages.length === 0 && !partial;

  return (
    <div
      ref={scrollerRef}
      className="flex max-h-[min(42vh,360px)] flex-col gap-3 overflow-y-auto px-1 py-2 text-left"
      aria-live="polite"
    >
      {isEmpty ? (
        <p className="text-center font-body text-sm text-white/50">
          {t('live.transcript.placeholder')}
        </p>
      ) : null}

      {messages.map((message) => {
        const isUser = message.role === 'user';
        return (
          <div
            key={message.id}
            className={['flex flex-col', isUser ? 'items-end' : 'items-start'].join(' ')}
          >
            <span className="font-body text-[10px] tracking-wide text-white/45 uppercase">
              {isUser ? t('live.transcript.you') : t('live.transcript.guide')}
            </span>
            <p
              className={[
                'mt-1 max-w-[88%] rounded-2xl px-3 py-2 font-body text-sm leading-relaxed',
                isUser
                  ? 'bg-gradient-to-br from-blue to-blue-accent text-white'
                  : 'border border-white/10 bg-white/10 text-white/90 backdrop-blur-sm',
              ].join(' ')}
            >
              {message.text}
            </p>
          </div>
        );
      })}

      {partial ? (
        <div className="flex flex-col items-end">
          <span className="font-body text-[10px] tracking-wide text-white/45 uppercase">
            {t('live.transcript.you')}
          </span>
          <p className="mt-1 max-w-[88%] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 font-body text-sm italic text-white/70 backdrop-blur-sm">
            {partial}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function WelcomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser((state) => state.user);
  const session = useLiveSession();

  useEffect(() => {
    if (!user) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const bodyParagraphs = t('welcome.body').split('\n\n');
  const isSessionActive = ACTIVE_SESSION_STATUSES.has(session.status);
  const errorLabel = session.inlineError ? translateInlineError(t, session.inlineError) : null;

  return (
    <div className="awakening relative min-h-dvh overflow-hidden text-white">
      <div className="awakening__stars" aria-hidden>
        <div className="awakening__stars-layer awakening__stars-layer--far" />
        <div className="awakening__stars-layer awakening__stars-layer--near" />
      </div>

      <BrandMark variant="on-dark" className="absolute top-8 left-6 z-20 md:left-10" />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-lg text-center">
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-medium leading-tight tracking-tight text-white">
            {t('welcome.greeting', { name: user.displayName })}
          </h1>

          {!isSessionActive ? (
            <>
              <div className="mt-8 space-y-4 font-body text-base leading-relaxed text-white/85 md:text-lg">
                {bodyParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              {errorLabel ? (
                <p
                  role="alert"
                  className="mt-6 rounded-full bg-red/20 px-4 py-2 font-body text-sm text-white"
                >
                  {errorLabel}
                </p>
              ) : null}

              <div className="mt-12 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    void session.joinLive();
                  }}
                  className="inline-flex w-full max-w-sm items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-8 py-4 font-body text-base font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent active:scale-[0.98]"
                >
                  {t('welcome.startButton')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/');
                  }}
                  className="font-body text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
                >
                  {t('welcome.skipButton')}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-8 w-full rounded-[20px] border border-white/15 bg-white/5 p-4 text-left shadow-[0_8px_32px_rgb(0_0_0_/_25%)] backdrop-blur-md">
              <p className="text-center font-body text-sm text-white/70" role="status">
                {sessionStatusLabel(t, session.status)}
              </p>

              <WelcomeInlineTranscript
                messages={session.messages}
                partial={session.partialTranscript}
              />

              {errorLabel ? (
                <p
                  role="alert"
                  className="mb-3 rounded-full bg-red/20 px-4 py-2 text-center font-body text-xs text-white"
                >
                  {errorLabel}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={session.toggleMic}
                  className="rounded-full border border-white/20 px-5 py-2.5 font-body text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
                >
                  {session.isMicOn ? t('live.controls.mute') : t('live.controls.unmute')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void session.endLive();
                  }}
                  className="rounded-full border border-white/20 px-5 py-2.5 font-body text-sm font-medium text-white/80 transition-colors hover:border-red-warm/60 hover:text-red-warm"
                >
                  {t('live.controls.end')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

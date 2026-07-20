import { MessageSquare, Mic, Send } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { BrandMark } from '@/components/ui/brand-mark';
import type { LiveChatMessage, LiveSessionStatus } from '@/features/live/use-live-session';
import { formatMessageTime, messageTimeDateTime } from '@/features/live/format-message-time';
import { useLiveSession } from '@/features/live/use-live-session';
import { useReturnContext } from '@/features/onboarding/use-return-context';
import { useCurrentUser } from '@/stores/current-user';

import '@/features/awakening/awakening.css';

const ACTIVE_SESSION_STATUSES: ReadonlySet<LiveSessionStatus> = new Set([
  'connecting',
  'ready',
  'listening',
  'thinking',
  'speaking',
]);

type SessionPhase = 'idle' | 'choosing-mode' | 'active';
type InteractionMode = 'voice' | 'text';

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

function sessionStatusLabel(
  t: (key: string) => string,
  status: LiveSessionStatus,
  interactionMode: InteractionMode | null,
): string {
  if (interactionMode === 'text' && status === 'ready') {
    return t('welcome.session.writingReady');
  }

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
  const { t, i18n } = useTranslation();
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
      className="scrollbar-on-dark flex max-h-[min(42vh,360px)] flex-col gap-3 overflow-y-auto px-1 py-2 pr-2 text-left"
      aria-live="polite"
    >
      {isEmpty ? (
        <p className="text-center font-body text-sm text-white/50">
          {t('live.transcript.placeholder')}
        </p>
      ) : null}

      {messages.map((message) => {
        const isUser = message.role === 'user';
        const sentAt = formatMessageTime(message.createdAt, i18n.language);
        return (
          <div
            key={message.id}
            className={['flex flex-col', isUser ? 'items-end' : 'items-start'].join(' ')}
          >
            <div
              className={[
                'flex max-w-[88%] items-center gap-2',
                isUser ? 'flex-row-reverse' : 'flex-row',
              ].join(' ')}
            >
              <span className="font-body text-[10px] tracking-wide text-white/45 uppercase">
                {isUser ? t('live.transcript.you') : t('live.transcript.guide')}
              </span>
              {sentAt ? (
                <time
                  dateTime={messageTimeDateTime(message.createdAt)}
                  className="font-body text-[10px] text-white/35 normal-case"
                >
                  {sentAt}
                </time>
              ) : null}
            </div>
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
  const { context, isLoading: isReturnLoading } = useReturnContext(user?.userId);
  const [textInput, setTextInput] = useState('');
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('idle');
  const [interactionMode, setInteractionMode] = useState<InteractionMode | null>(null);
  const textInputId = useId();

  const handleSendText = () => {
    const value = textInput.trim();
    if (!value) return;
    void session.sendTextMessage(value);
    setTextInput('');
  };

  const controlsInlineError = session.inlineError === 'textSendFailed' ? null : session.inlineError;

  useEffect(() => {
    if (!user) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (session.status === 'error' || session.status === 'ended') {
      setSessionPhase('idle');
      setInteractionMode(null);
    }
  }, [session.status]);

  const handleChooseVoice = () => {
    setInteractionMode('voice');
    setSessionPhase('active');
    void session.joinLive();
  };

  const handleChooseText = () => {
    setInteractionMode('text');
    setSessionPhase('active');
    void session.startTextSession();
  };

  const handleSwitchToVoice = () => {
    setInteractionMode('voice');
    void session.switchToVoice();
  };

  const handleEndSession = () => {
    void (async () => {
      await session.endLive();
      setSessionPhase('idle');
      setInteractionMode(null);
      navigate('/watchtowers');
    })();
  };

  if (!user) {
    return null;
  }

  const isReturning = context?.returning === true;
  const lastTopic = context?.lastTopic;
  const greeting = isReturning
    ? t('welcome.returning.greeting', { name: user.displayName })
    : t('welcome.greeting', { name: user.displayName });
  const bodyParagraphs = (
    isReturning
      ? lastTopic
        ? t('welcome.returning.bodyWithTopic', { topic: lastTopic })
        : t('welcome.returning.bodyFallback')
      : t('welcome.body')
  ).split('\n\n');
  const startLabel = isReturning ? t('welcome.returning.continueButton') : t('welcome.startButton');
  const isSessionActive = ACTIVE_SESSION_STATUSES.has(session.status);
  const errorLabel = controlsInlineError ? translateInlineError(t, controlsInlineError) : null;

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
            {greeting}
          </h1>

          {!isSessionActive && sessionPhase !== 'choosing-mode' ? (
            <>
              {isReturnLoading ? (
                <p className="mt-8 font-body text-base text-white/60" aria-live="polite">
                  {t('welcome.returning.loading')}
                </p>
              ) : (
                <div className="mt-8 space-y-4 font-body text-base leading-relaxed text-white/85 md:text-lg">
                  {bodyParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              )}

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
                    setSessionPhase('choosing-mode');
                  }}
                  disabled={isReturnLoading}
                  className="inline-flex w-full max-w-sm items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-8 py-4 font-body text-base font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {startLabel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate(isReturning ? '/today' : '/');
                  }}
                  className="font-body text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
                >
                  {t('welcome.skipButton')}
                </button>
              </div>
            </>
          ) : sessionPhase === 'choosing-mode' ? (
            <div className="mt-8 w-full rounded-[20px] border border-white/15 bg-white/5 p-6 text-left shadow-[0_8px_32px_rgb(0_0_0_/_25%)] backdrop-blur-md">
              <p className="text-center font-display text-xl font-medium leading-snug text-white">
                {t('welcome.modeChoice.prompt')}
              </p>
              <p className="mt-3 text-center font-body text-sm leading-relaxed text-white/65">
                {t('welcome.modeChoice.hint')}
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleChooseVoice}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-6 py-4 font-body text-base font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent active:scale-[0.98]"
                >
                  <Mic className="h-5 w-5" aria-hidden />
                  {t('welcome.modeChoice.voice')}
                </button>
                <button
                  type="button"
                  onClick={handleChooseText}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-white/25 bg-white/10 px-6 py-4 font-body text-base font-semibold text-white transition-colors hover:border-white/45 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent active:scale-[0.98]"
                >
                  <MessageSquare className="h-5 w-5" aria-hidden />
                  {t('welcome.modeChoice.writing')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSessionPhase('idle');
                }}
                className="mt-6 w-full font-body text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
              >
                {t('welcome.modeChoice.back')}
              </button>
            </div>
          ) : (
            <>
              {isReturning && lastTopic ? (
                <p className="mt-6 font-body text-base leading-relaxed text-white/70 md:text-lg">
                  {t('welcome.returning.continuingHint', { topic: lastTopic })}
                </p>
              ) : null}
              <div className="mt-8 w-full rounded-[20px] border border-white/15 bg-white/5 p-4 text-left shadow-[0_8px_32px_rgb(0_0_0_/_25%)] backdrop-blur-md">
                <p className="text-center font-body text-sm text-white/70" role="status">
                  {sessionStatusLabel(t, session.status, interactionMode)}
                </p>

                <WelcomeInlineTranscript
                  messages={session.messages}
                  partial={interactionMode === 'voice' ? session.partialTranscript : null}
                />

                {interactionMode === 'text' && session.isLive ? (
                  <div className="mb-3 flex flex-col gap-2 border-t border-white/10 pt-3">
                    {session.inlineError === 'textSendFailed' ? (
                      <p role="alert" className="font-body text-xs text-red-warm">
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
                        className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-3 font-body text-base text-white outline-none transition-colors placeholder:text-white/45 focus-visible:border-blue-accent focus-visible:ring-2 focus-visible:ring-blue-accent/30"
                      />
                      <button
                        type="button"
                        onClick={handleSendText}
                        disabled={!textInput.trim()}
                        aria-label={t('live.textInput.send')}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:border-white/40 hover:bg-white/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Send className="h-5 w-5" aria-hidden />
                      </button>
                    </div>
                  </div>
                ) : null}

                {errorLabel ? (
                  <p
                    role="alert"
                    className="mb-3 rounded-full bg-red/20 px-4 py-2 text-center font-body text-xs text-white"
                  >
                    {errorLabel}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 pt-4">
                  {interactionMode === 'text' ? (
                    <button
                      type="button"
                      onClick={handleSwitchToVoice}
                      disabled={session.isConnecting}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 font-body text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Mic className="h-4 w-4" aria-hidden />
                      {t('welcome.session.switchToVoice')}
                    </button>
                  ) : null}
                  {interactionMode === 'voice' ? (
                    <button
                      type="button"
                      onClick={session.toggleMic}
                      className="rounded-full border border-white/20 px-5 py-2.5 font-body text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
                    >
                      {session.isMicOn ? t('live.controls.mute') : t('live.controls.unmute')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleEndSession}
                    className="rounded-full border border-white/20 px-5 py-2.5 font-body text-sm font-medium text-white/80 transition-colors hover:border-red-warm/60 hover:text-red-warm"
                  >
                    {t('welcome.finishAndWatchtowers')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

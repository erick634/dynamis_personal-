import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { LiveChatMessage } from '@/features/live/use-live-session';

type LiveTranscriptProps = {
  messages: LiveChatMessage[];
  partial: string | null;
};

export function LiveTranscript({ messages, partial }: LiveTranscriptProps) {
  const { t } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, partial]);

  const isEmpty = messages.length === 0 && !partial;

  return (
    <section className="flex flex-col gap-3 border-t border-line-soft bg-white px-4 py-4 md:px-6">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-ink">
          {t('live.transcript.title')}
        </h2>
        {partial ? (
          <span className="font-body text-xs text-ink-3" aria-live="polite">
            {t('live.transcript.listening')}
          </span>
        ) : null}
      </header>

      <div
        ref={scrollerRef}
        className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1"
        aria-live="polite"
      >
        {isEmpty ? (
          <p className="font-body text-sm text-ink-3">{t('live.transcript.placeholder')}</p>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={message.id}
              className={['flex flex-col', isUser ? 'items-end' : 'items-start'].join(' ')}
            >
              <span className="font-body text-[11px] tracking-wide text-ink-3 uppercase">
                {isUser ? t('live.transcript.you') : t('live.transcript.guide')}
              </span>
              <p
                className={[
                  'mt-1 max-w-[80%] rounded-2xl px-3 py-2 font-body text-sm leading-relaxed',
                  isUser
                    ? 'bg-gradient-to-br from-blue to-blue-accent text-white'
                    : 'bg-bg-soft text-ink',
                ].join(' ')}
              >
                {message.text}
              </p>
            </div>
          );
        })}

        {partial ? (
          <div className="flex flex-col items-end">
            <span className="font-body text-[11px] tracking-wide text-ink-3 uppercase">
              {t('live.transcript.you')}
            </span>
            <p className="mt-1 max-w-[80%] rounded-2xl bg-bg-soft px-3 py-2 font-body text-sm italic text-ink-2">
              {partial}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

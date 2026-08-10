import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { UnlockLoadingIndicator } from '@/components/ui/unlock-loading-indicator';
import { fetchChatSessionDetail } from '@/features/chat-history/chat-history-api';
import { useCurrentUser } from '@/stores/current-user';

export function ChatSessionScreen() {
  const { t } = useTranslation();
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const userId = useCurrentUser((state) => state.user?.userId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['chat-session', userId, sessionId],
    queryFn: () => {
      if (!userId || !sessionId) {
        throw new Error('userId and sessionId are required');
      }
      return fetchChatSessionDetail(userId, sessionId);
    },
    enabled: Boolean(userId && sessionId),
  });

  const messages = data?.messages ?? [];

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col px-4 py-6 sm:px-6 md:max-w-2xl md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/chats"
          className="inline-flex items-center gap-2 font-body text-sm font-medium text-ink-2 hover:text-blue"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('chatHistory.detail.back')}
        </Link>
        {sessionId ? (
          <Link
            to={`/guide?session=${encodeURIComponent(sessionId)}`}
            className="rounded-full bg-blue px-4 py-2 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t('chatHistory.detail.continue')}
          </Link>
        ) : null}
      </div>

      <h1 className="mt-6 font-display text-2xl font-semibold text-ink">
        {t('chatHistory.detail.title')}
      </h1>

      {!userId ? (
        <p className="mt-6 font-body text-sm text-ink-2">{t('chatHistory.noUser')}</p>
      ) : null}

      {userId && isLoading ? (
        <UnlockLoadingIndicator label={t('chatHistory.loading')} className="mt-8" />
      ) : null}

      {userId && isError ? (
        <div className="mt-8 rounded-2xl border border-red/30 bg-white/70 p-5" role="alert">
          <p className="font-body text-sm font-semibold text-red">{t('chatHistory.error.title')}</p>
          <p className="mt-2 font-body text-sm text-ink-2">
            {error instanceof Error ? error.message : t('chatHistory.error.fallback')}
          </p>
        </div>
      ) : null}

      {messages.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-3">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            if (message.text.startsWith('[Voice session')) {
              return null;
            }
            return (
              <li
                key={message.id}
                className={['flex w-full', isUser ? 'justify-end' : 'justify-start'].join(' ')}
              >
                <div
                  className={[
                    'max-w-[90%] rounded-2xl px-4 py-3 font-body text-sm leading-relaxed',
                    isUser ? 'bg-blue text-white' : 'border border-line-soft bg-white text-ink',
                  ].join(' ')}
                >
                  {message.text}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { History, MessageSquarePlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { UnlockLoadingIndicator } from '@/components/ui/unlock-loading-indicator';
import { fetchChatSessions } from '@/features/chat-history/chat-history-api';
import type { ChatSessionSummary } from '@/features/chat-history/chat-history-types';
import { useCurrentUser } from '@/stores/current-user';

function formatSessionDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function SessionRow({ session }: { session: ChatSessionSummary }) {
  const { t, i18n } = useTranslation();
  return (
    <li>
      <Link
        to={`/chats/${session.session_id}`}
        className="block rounded-2xl border border-line-soft bg-white/80 p-4 transition-colors hover:border-blue/40 hover:bg-white"
      >
        <p className="font-body text-sm leading-relaxed text-ink line-clamp-2">{session.preview}</p>
        <p className="mt-2 font-body text-xs text-ink-3">
          {formatSessionDate(session.updated_at, i18n.language)}
          {' · '}
          {t('chatHistory.list.messageCount', { count: session.message_count })}
        </p>
      </Link>
    </li>
  );
}

export function ChatHistoryScreen() {
  const { t } = useTranslation();
  const userId = useCurrentUser((state) => state.user?.userId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['chat-sessions', userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('userId is required');
      }
      return fetchChatSessions(userId);
    },
    enabled: Boolean(userId),
  });

  const sessions = data ?? [];

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-6 sm:px-6 md:max-w-2xl md:px-8 md:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-body text-[11px] font-semibold tracking-[0.18em] text-blue uppercase">
            {t('chatHistory.eyebrow')}
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold text-ink md:text-4xl">
            {t('chatHistory.title')}
          </h1>
          <p className="mt-3 font-body text-base leading-relaxed text-ink-2">
            {t('chatHistory.subtitle')}
          </p>
        </div>
        <Link
          to="/guide?new=1"
          className="inline-flex items-center gap-2 rounded-full bg-blue px-4 py-2.5 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
          {t('chatHistory.newChat')}
        </Link>
      </header>

      {!userId ? (
        <p className="mt-8 font-body text-sm text-ink-2">{t('chatHistory.noUser')}</p>
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

      {userId && !isLoading && !isError && sessions.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line-soft bg-white/70 p-6 text-center">
          <History className="mx-auto h-8 w-8 text-ink-3" aria-hidden />
          <p className="mt-3 font-body text-sm text-ink-2">{t('chatHistory.empty')}</p>
          <Link
            to="/guide?new=1"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-blue px-5 py-2.5 font-body text-sm font-semibold text-white"
          >
            {t('chatHistory.newChat')}
          </Link>
        </div>
      ) : null}

      {sessions.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-3">
          {sessions.map((session) => (
            <SessionRow key={session.session_id} session={session} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

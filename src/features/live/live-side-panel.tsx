import { useTranslation } from 'react-i18next';

import type { LiveSessionStatus } from '@/features/live/use-live-session';

type LiveSidePanelProps = {
  status: LiveSessionStatus;
  partialTranscript: string | null;
  inlineError: string | null;
  sessionId: string | null;
};

const STATUS_KEYS: Record<LiveSessionStatus, string> = {
  idle: 'live.sidePanel.status.idle',
  connecting: 'live.sidePanel.status.connecting',
  ready: 'live.sidePanel.status.ready',
  listening: 'live.sidePanel.status.listening',
  thinking: 'live.sidePanel.status.thinking',
  speaking: 'live.sidePanel.status.speaking',
  error: 'live.sidePanel.status.error',
  ended: 'live.sidePanel.status.ended',
};

const ACTIVE_STATUSES: ReadonlySet<LiveSessionStatus> = new Set([
  'ready',
  'listening',
  'thinking',
  'speaking',
]);

export function LiveSidePanel({
  status,
  partialTranscript,
  inlineError,
  sessionId,
}: LiveSidePanelProps) {
  const { t } = useTranslation();
  const isActive = ACTIVE_STATUSES.has(status);
  const dotClass = isActive
    ? 'bg-success'
    : status === 'connecting'
      ? 'bg-blue-2 animate-pulse'
      : status === 'error'
        ? 'bg-red'
        : 'bg-line';

  const shortSessionId = sessionId ? sessionId.slice(0, 8) : null;
  const errorLabel = inlineError ? translateErrorCode(t, inlineError) : null;

  return (
    <aside className="flex flex-col gap-6 rounded-[20px] border border-line-soft bg-bg p-6 shadow-soft">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">{t('live.sidePanel.title')}</h2>
        <p className="mt-1 font-body text-sm text-ink-2">{t('live.sidePanel.hint')}</p>
      </div>

      <dl className="space-y-4 font-body text-sm">
        <div>
          <dt className="font-medium text-ink-3">{t('live.sidePanel.agentLabel')}</dt>
          <dd className="mt-1 font-display text-base font-semibold text-ink">
            {t('live.sidePanel.agentName')}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-ink-3">{t('live.sidePanel.connectionLabel')}</dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className={['h-2.5 w-2.5 rounded-full', dotClass].join(' ')} aria-hidden />
            <span className="font-medium text-ink">{t(STATUS_KEYS[status])}</span>
          </dd>
        </div>
        {shortSessionId ? (
          <div>
            <dt className="font-medium text-ink-3">{t('live.sidePanel.sessionLabel')}</dt>
            <dd className="mt-1 font-mono text-xs text-ink-2">{shortSessionId}</dd>
          </div>
        ) : null}
      </dl>

      <div className="rounded-[16px] bg-bg-deep px-5 py-5 text-white">
        <p className="font-body text-xs font-semibold tracking-wide text-red-warm uppercase">
          {t('live.sidePanel.transcriptTitle')}
        </p>
        <p className="mt-3 font-body text-sm leading-relaxed text-white/85">
          {partialTranscript ?? t('live.sidePanel.transcriptSample')}
        </p>
      </div>

      {errorLabel ? (
        <p role="alert" className="rounded-[12px] bg-red/10 px-4 py-3 font-body text-xs text-red-deep">
          {errorLabel}
        </p>
      ) : null}
    </aside>
  );
}

function translateErrorCode(t: (key: string) => string, value: string): string {
  if (value === 'noToken' || value === 'micDenied' || value === 'connection' || value === 'backend') {
    return t(`live.errors.${value}`);
  }
  return value;
}

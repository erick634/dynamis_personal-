import { Mic, MicOff, Radio } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { LiveSessionStatus } from '@/features/live/use-live-session';

type LiveControlsProps = {
  status: LiveSessionStatus;
  isMicOn: boolean;
  inlineError: string | null;
  onJoin: () => void;
  onEnd: () => void;
  onToggleMic: () => void;
  onReset: () => void;
};

const ACTIVE_STATUSES: ReadonlySet<LiveSessionStatus> = new Set([
  'ready',
  'listening',
  'thinking',
  'speaking',
]);

export function LiveControls({
  status,
  isMicOn,
  inlineError,
  onJoin,
  onEnd,
  onToggleMic,
  onReset,
}: LiveControlsProps) {
  const { t } = useTranslation();
  const isActive = ACTIVE_STATUSES.has(status);
  const isConnecting = status === 'connecting';
  const isEnded = status === 'ended';
  const isError = status === 'error';
  const controlsDisabled = isConnecting;

  const errorLabel = inlineError ? translateErrorCode(t, inlineError) : null;

  return (
    <div className="flex flex-col gap-3 border-t border-line-soft bg-white px-4 py-4 md:px-6">
      {errorLabel ? (
        <p
          role="alert"
          className="rounded-full bg-red/10 px-4 py-2 text-center font-body text-xs text-red-deep"
        >
          {errorLabel}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {status === 'idle' || isError ? (
          <button
            type="button"
            onClick={onJoin}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-blue to-blue-accent px-6 py-3 font-body text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Radio className="h-5 w-5" aria-hidden />
            {t('live.controls.join')}
          </button>
        ) : null}

        {isConnecting ? (
          <span className="font-body text-sm text-ink-2" role="status">
            {t('live.stage.connecting')}
          </span>
        ) : null}

        {isActive ? (
          <>
            <ControlButton
              label={isMicOn ? t('live.controls.mute') : t('live.controls.unmute')}
              isActive={isMicOn}
              onClick={onToggleMic}
              disabled={controlsDisabled}
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </ControlButton>
            <button
              type="button"
              onClick={onEnd}
              className="rounded-full border border-line px-5 py-2.5 font-body text-sm font-medium text-ink-2 transition-colors hover:border-red/40 hover:text-red"
            >
              {t('live.controls.end')}
            </button>
          </>
        ) : null}

        {isEnded ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-full bg-bg-soft px-5 py-2.5 font-body text-sm font-medium text-blue transition-colors hover:bg-blue-soft"
          >
            {t('live.controls.joinAgain')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function translateErrorCode(t: (key: string) => string, value: string): string {
  if (value === 'noToken' || value === 'micDenied' || value === 'connection' || value === 'backend') {
    return t(`live.errors.${value}`);
  }
  return value;
}

type ControlButtonProps = {
  label: string;
  isActive: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ControlButton({ label, isActive, disabled, onClick, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isActive}
      className={[
        'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
        isActive
          ? 'bg-gradient-to-br from-blue to-blue-accent text-white shadow-[var(--shadow-soft)]'
          : 'bg-bg-soft text-ink-2 hover:bg-line-soft',
        disabled ? 'cursor-not-allowed opacity-40' : '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { StarField } from '@/components/ui/star-field';
import type { DiscoveryVoiceStatus } from '@/features/discovery/discovery-voice-types';
import { LiveOrb } from '@/features/live/live-orb';
import type { LiveSessionStatus } from '@/features/live/use-live-session';

import '@/features/discovery/discovery-live-stage.css';

type DiscoveryLiveStageProps = {
  voiceStatus: DiscoveryVoiceStatus;
  partialTranscript: string;
  voiceError: string | null;
  onClose: () => void;
};

function resolveVoiceErrorMessage(code: string | null, t: (key: string) => string): string | null {
  if (!code) {
    return null;
  }
  if (code === 'micDenied') {
    return t('discovery.voice.errorMicDenied');
  }
  if (code === 'noToken') {
    return t('discovery.voice.errorNoToken');
  }
  return code;
}

function toOrbStatus(status: DiscoveryVoiceStatus, hasError: boolean): LiveSessionStatus {
  if (hasError || status === 'error') {
    return 'error';
  }
  if (status === 'connecting') {
    return 'connecting';
  }
  if (status === 'thinking') {
    return 'thinking';
  }
  if (status === 'speaking') {
    return 'speaking';
  }
  if (status === 'listening') {
    return 'listening';
  }
  return 'ready';
}

export function DiscoveryLiveStage({
  voiceStatus,
  partialTranscript,
  voiceError,
  onClose,
}: DiscoveryLiveStageProps) {
  const { t } = useTranslation();
  const errorMessage = resolveVoiceErrorMessage(voiceError, t);
  const status = toOrbStatus(voiceStatus, errorMessage != null);

  const headlineKey =
    status === 'connecting'
      ? 'live.stage.connecting'
      : status === 'thinking'
        ? 'live.stage.thinking'
        : status === 'speaking'
          ? 'live.stage.agentSpeaking'
          : status === 'error'
            ? 'live.stage.errorHeadline'
            : status === 'listening'
              ? 'live.stage.listening'
              : 'discovery.live.readyHeadline';

  const hintKey =
    status === 'connecting'
      ? 'live.stage.agentHintConnecting'
      : status === 'thinking'
        ? 'live.stage.agentHintThinking'
        : status === 'speaking'
          ? 'live.stage.agentHintLive'
          : status === 'error'
            ? 'live.stage.agentHintError'
            : status === 'listening'
              ? 'live.stage.agentHintListening'
              : 'discovery.live.readyHint';

  return (
    <div
      className="discovery-live-stage fixed inset-0 z-[60] flex flex-col bg-bg-deep"
      role="dialog"
      aria-modal="true"
      aria-label={t('discovery.live.ariaLabel')}
    >
      <StarField className="z-0" />

      <div className="relative z-10 flex shrink-0 items-center justify-between px-4 py-4 sm:px-6">
        <span className="flex items-center gap-2 rounded-full bg-red/90 px-3 py-1 font-body text-xs font-semibold tracking-wide text-white uppercase">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" aria-hidden />
          {t('live.stage.liveBadge')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]"
          aria-label={t('discovery.live.closeLabel')}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="discovery-live-stage__orb">
          <LiveOrb status={status} size="lg" />
        </div>

        <div className="discovery-live-stage__copy mt-8 max-w-md text-center">
          <p className="font-display text-2xl font-semibold text-white sm:text-3xl">
            {t(headlineKey)}
          </p>
          <p className="mt-2 font-body text-sm text-white/70">{t(hintKey)}</p>
        </div>

        {partialTranscript && status !== 'speaking' ? (
          <p
            className="discovery-live-stage__copy mt-8 max-w-lg text-center font-body text-base text-white/90 italic"
            aria-live="polite"
          >
            {partialTranscript}
          </p>
        ) : null}

        {errorMessage ? (
          <p
            className="mt-6 max-w-md rounded-full bg-red/25 px-4 py-2 text-center font-body text-sm text-white"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}

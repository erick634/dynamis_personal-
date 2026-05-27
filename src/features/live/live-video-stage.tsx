import { useTranslation } from 'react-i18next';

import { LiveOrb } from '@/features/live/live-orb';
import type { LiveSessionStatus } from '@/features/live/use-live-session';

type LiveVideoStageProps = {
  status: LiveSessionStatus;
};

const STAGE_HEADLINE_KEYS: Record<LiveSessionStatus, string> = {
  idle: 'live.stage.agentWaiting',
  connecting: 'live.stage.connecting',
  ready: 'live.stage.agentWaiting',
  listening: 'live.stage.listening',
  thinking: 'live.stage.thinking',
  speaking: 'live.stage.agentSpeaking',
  error: 'live.stage.errorHeadline',
  ended: 'live.stage.sessionEnded',
};

const STAGE_HINT_KEYS: Record<LiveSessionStatus, string> = {
  idle: 'live.stage.agentHintIdle',
  connecting: 'live.stage.agentHintConnecting',
  ready: 'live.stage.agentHintReady',
  listening: 'live.stage.agentHintListening',
  thinking: 'live.stage.agentHintThinking',
  speaking: 'live.stage.agentHintLive',
  error: 'live.stage.agentHintError',
  ended: 'live.stage.agentHintEnded',
};

export function LiveVideoStage({ status }: LiveVideoStageProps) {
  const { t } = useTranslation();
  const showLiveBadge =
    status === 'ready' ||
    status === 'listening' ||
    status === 'thinking' ||
    status === 'speaking';

  return (
    <div
      className="relative flex min-h-[min(50vh,420px)] flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-bg-deep to-bg-deep-end px-6 py-10"
      role="img"
      aria-label={t('live.stage.ariaLabel')}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
        <span className="absolute top-[12%] left-[18%] h-1 w-1 rounded-full bg-white/60" />
        <span className="absolute top-[28%] right-[22%] h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="absolute bottom-[30%] left-[30%] h-1 w-1 rounded-full bg-white/50" />
      </div>

      {showLiveBadge ? (
        <span className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-red/90 px-3 py-1 font-body text-xs font-semibold tracking-wide text-white uppercase">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" aria-hidden />
          {t('live.stage.liveBadge')}
        </span>
      ) : null}

      <LiveOrb status={status} />

      <p className="mt-6 max-w-sm text-center font-display text-xl font-semibold text-white">
        {t(STAGE_HEADLINE_KEYS[status])}
      </p>
      <p className="mt-2 max-w-md text-center font-body text-sm text-white/65">
        {t(STAGE_HINT_KEYS[status])}
      </p>
    </div>
  );
}

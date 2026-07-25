import { BrandIcon } from '@/components/ui/brand-icon';
import type { LiveSessionStatus } from '@/features/live/use-live-session';

type LiveOrbSize = 'md' | 'lg';

type LiveOrbProps = {
  status: LiveSessionStatus;
  size?: LiveOrbSize;
};

const STATE_CLASSES: Record<LiveSessionStatus, string> = {
  idle: 'from-white/10 to-white/5 text-white/70',
  connecting: 'from-blue/40 to-blue-accent/30 text-white/80 animate-pulse',
  ready: 'from-blue/50 to-blue-accent/40 text-white',
  listening: 'from-success/70 to-blue-accent/50 text-white animate-pulse',
  thinking: 'from-blue/70 to-blue-accent/60 text-white animate-[pulse_1.6s_ease-in-out_infinite]',
  speaking: 'from-red-warm/80 to-red/70 text-white',
  error: 'from-red/60 to-red-deep/60 text-white',
  ended: 'from-white/10 to-white/5 text-white/60',
};

const SIZE_CLASSES: Record<LiveOrbSize, { shell: string; core: string; icon: string }> = {
  md: {
    shell: 'h-32 w-32',
    core: 'h-28 w-28',
    icon: 'h-12 w-12',
  },
  lg: {
    shell: 'h-48 w-48 sm:h-56 sm:w-56',
    core: 'h-40 w-40 sm:h-48 sm:w-48',
    icon: 'h-16 w-16 sm:h-20 sm:w-20',
  },
};

export function LiveOrb({ status, size = 'md' }: LiveOrbProps) {
  const stateClass = STATE_CLASSES[status];
  const sizeClass = SIZE_CLASSES[size];
  const ringPulse =
    status === 'speaking'
      ? 'animate-[ping_1.4s_cubic-bezier(0,0,0.2,1)_infinite]'
      : status === 'listening'
        ? 'animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]'
        : 'opacity-0';

  return (
    <div className={`relative flex items-center justify-center ${sizeClass.shell}`} aria-hidden>
      <span
        className={[
          'absolute inset-0 rounded-full bg-gradient-to-br',
          stateClass,
          'opacity-50 blur-2xl',
        ].join(' ')}
      />
      <span
        className={['absolute inset-0 rounded-full border border-white/30', ringPulse].join(' ')}
      />
      <div
        className={[
          'relative flex items-center justify-center rounded-full bg-gradient-to-br',
          sizeClass.core,
          stateClass,
          'shadow-glow-success',
        ].join(' ')}
      >
        <BrandIcon className={sizeClass.icon} />
      </div>
    </div>
  );
}

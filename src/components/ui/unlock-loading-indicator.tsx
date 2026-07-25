import '@/components/ui/unlock-loading-indicator.css';

type UnlockLoadingIndicatorVariant = 'on-light' | 'on-dark';

type UnlockLoadingIndicatorProps = {
  label: string;
  variant?: UnlockLoadingIndicatorVariant;
  className?: string;
};

const VARIANT_CLASSES: Record<UnlockLoadingIndicatorVariant, string> = {
  'on-light': 'text-ink-2',
  'on-dark': 'text-white/70',
};

/** Loading indicator: a small padlock whose shackle keeps opening (brand mark in motion). */
export function UnlockLoadingIndicator({
  label,
  variant = 'on-light',
  className = '',
}: UnlockLoadingIndicatorProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={['unlock-loading font-body text-sm', VARIANT_CLASSES[variant], className]
        .filter(Boolean)
        .join(' ')}
    >
      <svg viewBox="0 0 24 24" fill="none" className="unlock-loading__icon" aria-hidden>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path className="unlock-loading__shackle" d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span>{label}</span>
    </p>
  );
}

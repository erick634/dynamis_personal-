import { Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

type EndTheDayButtonProps = {
  /** `prominent` — header CTA; `inline` — slightly smaller in dense layouts */
  size?: 'prominent' | 'inline';
  className?: string;
};

export function EndTheDayButton({ size = 'prominent', className = '' }: EndTheDayButtonProps) {
  const { t } = useTranslation();

  const sizeClasses =
    size === 'prominent'
      ? 'gap-2 px-5 py-2.5 text-sm shadow-soft'
      : 'gap-1.5 px-4 py-2 text-xs shadow-soft';

  return (
    <Link
      to="/guide?mode=reflection"
      title={t('discovery.endTheDayTooltip')}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full font-body font-semibold transition-transform',
        'border-2 border-blue/30 bg-gradient-to-r from-blue-soft via-white to-blue-soft/80 text-blue',
        'hover:scale-[1.02] hover:border-blue/50 hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent',
        sizeClasses,
        className,
      ].join(' ')}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue/15">
        <Moon className="h-4 w-4 text-blue" aria-hidden />
      </span>
      <span>{t('discovery.endTheDay')}</span>
    </Link>
  );
}

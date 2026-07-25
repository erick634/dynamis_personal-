import { useTranslation } from 'react-i18next';

import { BrandIcon } from '@/components/ui/brand-icon';

type BrandMarkVariant = 'on-dark' | 'on-light';

type BrandMarkProps = {
  variant?: BrandMarkVariant;
  className?: string;
};

export function BrandMark({ variant = 'on-light', className = '' }: BrandMarkProps) {
  const { t } = useTranslation();
  const isOnDark = variant === 'on-dark';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <span
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          isOnDark ? 'bg-blue/20 text-blue-soft ring-1 ring-blue-accent/40' : 'bg-blue text-white',
        ].join(' ')}
        aria-hidden
      >
        <BrandIcon className="h-5 w-5" />
      </span>
      <span
        className={[
          'font-display text-xl font-semibold tracking-tight',
          isOnDark ? 'text-white' : 'text-blue',
        ].join(' ')}
      >
        {t('brand.name')}
      </span>
    </div>
  );
}

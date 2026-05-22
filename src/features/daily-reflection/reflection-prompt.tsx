import { useTranslation } from 'react-i18next';

export function ReflectionPrompt() {
  const { t } = useTranslation();

  return (
    <div className="border-b border-success/20 bg-success/10 px-4 py-4 md:px-6">
      <p className="font-body text-xs font-semibold tracking-wide text-success-deep uppercase">
        {t('dailyReflection.prompt.eyebrow')}
      </p>
      <h2 className="mt-1 font-display text-lg font-semibold text-ink">
        {t('dailyReflection.prompt.title')}
      </h2>
      <p className="mt-1 font-body text-sm text-ink-2">{t('dailyReflection.prompt.subtitle')}</p>
    </div>
  );
}

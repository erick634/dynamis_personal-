import { useTranslation } from 'react-i18next';

const BENEFITS = [
  {
    icon: '🔒',
    titleKey: 'awakening.benefits.secure.title',
    bodyKey: 'awakening.benefits.secure.body',
  },
  {
    icon: '⚡',
    titleKey: 'awakening.benefits.personalized.title',
    bodyKey: 'awakening.benefits.personalized.body',
  },
  {
    icon: '⭐',
    titleKey: 'awakening.benefits.impact.title',
    bodyKey: 'awakening.benefits.impact.body',
  },
] as const;

export function AwakeningBenefits() {
  const { t } = useTranslation();

  return (
    <section
      id="benefits"
      className="awakening__benefits"
      aria-labelledby="awakening-benefits-title"
    >
      <h2 id="awakening-benefits-title" className="sr-only">
        {t('awakening.benefits.sectionLabel')}
      </h2>
      <div className="awakening__benefits-card">
        {BENEFITS.map((benefit) => (
          <article key={benefit.titleKey} className="awakening__benefit">
            <p className="awakening__benefit-icon" aria-hidden>
              {benefit.icon}
            </p>
            <h3 className="awakening__benefit-title">{t(benefit.titleKey)}</h3>
            <p className="awakening__benefit-body">{t(benefit.bodyKey)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

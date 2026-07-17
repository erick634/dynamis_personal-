import { Trans, useTranslation } from 'react-i18next';

import { AwakeningBenefits } from '@/features/awakening/awakening-benefits';
import { AwakeningCta } from '@/features/awakening/awakening-cta';
import { AwakeningNav } from '@/features/awakening/awakening-nav';

import '@/features/awakening/awakening.css';

export function AwakeningScreen() {
  const { t } = useTranslation();

  return (
    <div className="awakening relative min-h-dvh overflow-hidden text-white">
      <div className="awakening__stars" aria-hidden>
        <div className="awakening__stars-layer awakening__stars-layer--far" />
        <div className="awakening__stars-layer awakening__stars-layer--near" />
      </div>

      <div className="awakening__spark" aria-hidden />
      <div className="awakening__ambient" aria-hidden />

      <AwakeningNav />

      <main className="relative z-10 mx-auto flex min-h-dvh max-w-7xl flex-col px-6 pt-28 pb-16 md:px-10 md:pt-32 lg:px-12 lg:pb-20">
        <div className="flex flex-1 flex-col justify-center">
          <section className="awakening__hero max-w-[45%] min-w-0 max-md:max-w-none">
            <p className="awakening__eyebrow awakening__fade-up">{t('awakening.eyebrow')}</p>
            <h1 className="awakening__headline awakening__fade-up awakening__fade-up--1">
              <Trans
                i18nKey="awakening.headline.line1"
                components={{
                  em: <em className="awakening__headline-em" />,
                }}
              />
            </h1>
            <p className="awakening__description awakening__fade-up awakening__fade-up--2">
              {t('awakening.description')}
            </p>
            <p className="awakening__line2-wrap awakening__fade-up awakening__fade-up--3">
              <span className="awakening__line2">{t('awakening.headline.line2')}</span>
            </p>
            <div className="awakening__fade-up awakening__fade-up--4">
              <AwakeningCta />
            </div>
          </section>
        </div>

        <div className="awakening__fade-up awakening__fade-up--5 mt-16 lg:mt-20">
          <AwakeningBenefits />
        </div>
      </main>
    </div>
  );
}

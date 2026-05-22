import { Trans, useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/ui/brand-mark';
import { AwakeningCta } from '@/features/awakening/awakening-cta';
import { AwakeningDoor } from '@/features/awakening/awakening-door';

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

      <BrandMark variant="on-dark" className="absolute top-8 left-6 z-20 md:left-10" />

      <div className="relative z-10 grid min-h-dvh lg:grid-cols-[1fr_min(38vw,360px)]">
        <section className="flex flex-col justify-center px-6 pt-24 pb-16 md:px-12 lg:px-16 xl:px-20">
          <h1 className="max-w-2xl font-display text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.08] font-medium tracking-tight text-white">
            <Trans
              i18nKey="awakening.headline.line1"
              components={{
                em: <em className="awakening__headline-em" />,
              }}
            />
          </h1>
          <p className="mt-6 max-w-xl font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium text-white/95">
            <span className="awakening__line2">{t('awakening.headline.line2')}</span>
          </p>
          <AwakeningCta />
        </section>

        <AwakeningDoor />
      </div>
    </div>
  );
}

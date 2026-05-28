import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { BrandMark } from '@/components/ui/brand-mark';
import { useCurrentUser } from '@/stores/current-user';

import '@/features/awakening/awakening.css';

export function WelcomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser((state) => state.user);

  useEffect(() => {
    if (!user) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const bodyParagraphs = t('welcome.body').split('\n\n');

  return (
    <div className="awakening relative min-h-dvh overflow-hidden text-white">
      <div className="awakening__stars" aria-hidden>
        <div className="awakening__stars-layer awakening__stars-layer--far" />
        <div className="awakening__stars-layer awakening__stars-layer--near" />
      </div>

      <BrandMark variant="on-dark" className="absolute top-8 left-6 z-20 md:left-10" />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-lg text-center">
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-medium leading-tight tracking-tight text-white">
            {t('welcome.greeting', { name: user.displayName })}
          </h1>

          <div className="mt-8 space-y-4 font-body text-base leading-relaxed text-white/85 md:text-lg">
            {bodyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => {
                navigate('/live');
              }}
              className="inline-flex w-full max-w-sm items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-8 py-4 font-body text-base font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent active:scale-[0.98]"
            >
              {t('welcome.startButton')}
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/');
              }}
              className="font-body text-sm text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
            >
              {t('welcome.skipButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

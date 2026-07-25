import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useHyperspaceNavigate } from '@/hooks/use-hyperspace-navigate';
import { useCurrentUser } from '@/stores/current-user';

export function AwakeningCta() {
  const { t } = useTranslation();
  const hyperspaceNavigate = useHyperspaceNavigate();
  const user = useCurrentUser((state) => state.user);

  return (
    <button
      type="button"
      onClick={() => {
        hyperspaceNavigate(user ? '/guide' : '/onboarding');
      }}
      className="awakening__cta group mt-10 inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#F35F4B] px-8 py-4 font-body text-base font-semibold text-white shadow-[0_0_0_1px_rgb(255_255_255_/_8%),0_8px_32px_rgb(243_95_75_/_22%)] transition-[transform,box-shadow,background-color] duration-300 hover:scale-[1.02] hover:bg-[#ff6d5a] hover:shadow-[0_0_0_1px_rgb(255_255_255_/_12%),0_12px_40px_rgb(243_95_75_/_32%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5468FF] active:scale-[0.98]"
    >
      {t('awakening.cta.primary')}
      <ArrowRight
        className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}

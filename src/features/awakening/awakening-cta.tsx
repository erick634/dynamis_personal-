import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function AwakeningCta() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        navigate('/today');
      }}
      className="mt-10 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-8 py-4 font-body text-base font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent active:scale-[0.98]"
    >
      {t('awakening.cta.primary')}
    </button>
  );
}

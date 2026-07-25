import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { StarField } from '@/components/ui/star-field';
import { useHyperspaceStore } from '@/stores/hyperspace.store';

import '@/components/ui/hyperspace-transition.css';

const ARRIVAL_DELAY_MS = 1050;
const FINISH_DELAY_MS = 1400;

export function HyperspaceTransition() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isPlaying = useHyperspaceStore((state) => state.isPlaying);
  const destination = useHyperspaceStore((state) => state.destination);
  const onArrive = useHyperspaceStore((state) => state.onArrive);
  const finishHyperspace = useHyperspaceStore((state) => state.finishHyperspace);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const root = document.getElementById('root');
    root?.setAttribute('aria-busy', 'true');

    const arrivalTimer = window.setTimeout(() => {
      if (destination) {
        navigate(destination);
      }
      onArrive?.();
    }, ARRIVAL_DELAY_MS);

    const finishTimer = window.setTimeout(() => {
      finishHyperspace();
    }, FINISH_DELAY_MS);

    return () => {
      window.clearTimeout(arrivalTimer);
      window.clearTimeout(finishTimer);
      root?.removeAttribute('aria-busy');
    };
  }, [destination, finishHyperspace, isPlaying, navigate, onArrive]);

  if (!isPlaying) {
    return null;
  }

  return (
    <div className="hyperspace-transition" role="status" aria-label={t('hyperspace.ariaLabel')}>
      <StarField className="hyperspace-transition__stars" variant="warp" />
      <div className="hyperspace-transition__vignette" aria-hidden />
      <div className="hyperspace-transition__mark" aria-hidden>
        <svg viewBox="0 0 64 64" fill="none">
          <rect x="13" y="29" width="38" height="27" rx="6" />
          <path className="hyperspace-transition__shackle" d="M21 29V20a11 11 0 0 1 22 0v9" />
          <circle cx="32" cy="42" r="3" fill="currentColor" stroke="none" />
          <path d="M32 45v5" />
        </svg>
      </div>
      <div className="hyperspace-transition__flash" aria-hidden />
    </div>
  );
}

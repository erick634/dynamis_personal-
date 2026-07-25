import { useNavigate } from 'react-router-dom';

import { useHyperspaceStore } from '@/stores/hyperspace.store';

type HyperspaceNavigate = (destination: string | null, onArrive?: () => void) => void;

export function useHyperspaceNavigate(): HyperspaceNavigate {
  const navigate = useNavigate();
  const startHyperspace = useHyperspaceStore((state) => state.startHyperspace);

  return (destination, onArrive) => {
    const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCurrentRoute = destination != null && destination === window.location.pathname;

    if (hasReducedMotion || isCurrentRoute) {
      if (destination && !isCurrentRoute) {
        navigate(destination);
      }
      onArrive?.();
      return;
    }

    startHyperspace(destination, onArrive);
  };
}

import { create } from 'zustand';

type HyperspaceDestination = string | null;

type HyperspaceState = {
  isPlaying: boolean;
  destination: HyperspaceDestination;
  onArrive: (() => void) | null;
  startHyperspace: (destination: HyperspaceDestination, onArrive?: () => void) => void;
  finishHyperspace: () => void;
};

export const useHyperspaceStore = create<HyperspaceState>((set, get) => ({
  isPlaying: false,
  destination: null,
  onArrive: null,
  startHyperspace: (destination, onArrive) => {
    if (get().isPlaying) {
      return;
    }
    set({ isPlaying: true, destination, onArrive: onArrive ?? null });
  },
  finishHyperspace: () => {
    set({ isPlaying: false, destination: null, onArrive: null });
  },
}));

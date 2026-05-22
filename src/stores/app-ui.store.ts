import { create } from 'zustand';

type AppUiState = {
  isAgentThinking: boolean;
  setAgentThinking: (active: boolean) => void;
};

export const useAppUiStore = create<AppUiState>((set) => ({
  isAgentThinking: false,
  setAgentThinking: (active) => {
    set({ isAgentThinking: active });
  },
}));

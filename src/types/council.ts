import type { CouncilAgentId } from '@/lib/livekit';

export type CouncilAgentStatus = 'suggested' | 'aligned';

export type CouncilAgent = {
  id: CouncilAgentId;
  status: CouncilAgentStatus;
  /** When set, overrides the default i18n status line for this agent. */
  hint?: string;
};

export type TodayCouncil = {
  userId: string;
  agents: CouncilAgent[];
  updatedAt: string;
};

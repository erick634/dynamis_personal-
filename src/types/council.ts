import type { CouncilAgentId } from '@/lib/livekit';

export type CouncilAgentStatus = 'suggested' | 'aligned';

export type CouncilAgent = {
  id: CouncilAgentId;
  status: CouncilAgentStatus;
};

export type TodayCouncil = {
  userId: string;
  agents: CouncilAgent[];
  updatedAt: string;
};

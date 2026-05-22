import type { ProfileDimension } from '@/types/intent-profile';

export type DiscoveryMessageRole = 'agent' | 'user';

export type DiscoveryMessage = {
  id: string;
  role: DiscoveryMessageRole;
  /** Seeded copy — resolved via i18n in the UI */
  contentKey?: string;
  /** User-typed or LiveKit `agent.message` payload */
  text?: string;
};

export type ProfileSignals = Record<ProfileDimension, number>;

export type DiscoverySessionMode = 'discovery' | 'reflection';

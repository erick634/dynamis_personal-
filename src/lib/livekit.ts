/** LiveKit data channel events — keep in sync with backend (rule 13). */

export type AgentMessageEvent = {
  type: 'agent.message';
  text: string;
  role: 'agent' | 'user';
};

export type AgentThinkingEvent = {
  type: 'agent.thinking';
  active: boolean;
};

export type ProfileSignalEvent = {
  type: 'profile.signal';
  dimension: 'values' | 'mission' | 'strengths' | 'constraints';
  delta: number;
};

export type PossibilityMapUpdatedEvent = {
  type: 'possibility_map.updated';
};

export type EnergeiaRealizedEvent = {
  type: 'energeia.realized';
  goal_id: string;
};

export type CouncilAgentId = 'dynamis' | 'health' | 'navigator' | 'purpose';

export type CouncilSuggestionEvent = {
  type: 'council.suggestion';
  agent: CouncilAgentId;
  text: string;
};

export type LiveKitDataEvent =
  | AgentMessageEvent
  | AgentThinkingEvent
  | ProfileSignalEvent
  | PossibilityMapUpdatedEvent
  | EnergeiaRealizedEvent
  | CouncilSuggestionEvent;

export function parseLiveKitDataEvent(payload: Uint8Array): LiveKitDataEvent | null {
  try {
    const raw: unknown = JSON.parse(new TextDecoder().decode(payload));
    if (!isLiveKitDataEvent(raw)) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

function isLiveKitDataEvent(value: unknown): value is LiveKitDataEvent {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return false;
  }
  const eventType = value.type;
  return typeof eventType === 'string' && eventType.length > 0;
}

/** Stub — token fetch wired when backend is available. */
export function fetchLiveKitToken(_userId: string, _roomName: string): Promise<string> {
  return Promise.resolve('');
}

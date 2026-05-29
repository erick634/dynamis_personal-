import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';
import type { ProfileSignals } from '@/features/discovery/discovery-types';

export type DiscoverySignalsResponse = {
  profile_signals: ProfileSignals;
  insight: string;
};

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (DYNAMIS_JWT.trim()) {
    headers.Authorization = `Bearer ${DYNAMIS_JWT}`;
  }
  return headers;
}

function isValidSignals(value: unknown): value is ProfileSignals {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  const dimensions = ['values', 'mission', 'strengths', 'constraints'] as const;
  return dimensions.every((key) => {
    const score = record[key];
    return typeof score === 'number' && Number.isFinite(score);
  });
}

export async function fetchDiscoverySignals(
  userId: string,
): Promise<DiscoverySignalsResponse | null> {
  try {
    const url = new URL(`${API_BASE_URL}/discovery-signals`);
    url.searchParams.set('user_id', userId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: buildAuthHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as DiscoverySignalsResponse;
    if (!isValidSignals(data.profile_signals) || typeof data.insight !== 'string') {
      return null;
    }

    return {
      profile_signals: {
        values: Math.min(100, Math.max(0, Math.round(data.profile_signals.values))),
        mission: Math.min(100, Math.max(0, Math.round(data.profile_signals.mission))),
        strengths: Math.min(100, Math.max(0, Math.round(data.profile_signals.strengths))),
        constraints: Math.min(100, Math.max(0, Math.round(data.profile_signals.constraints))),
      },
      insight: data.insight.trim(),
    };
  } catch {
    return null;
  }
}

export type ChatTurnResponse = {
  reply?: string;
  session_id?: string;
  profile_signals?: ProfileSignals;
  insight?: string;
};

export function parseChatSignalsPayload(data: ChatTurnResponse): DiscoverySignalsResponse | null {
  if (!data.profile_signals || !isValidSignals(data.profile_signals)) {
    return null;
  }
  const insight = typeof data.insight === 'string' ? data.insight.trim() : '';
  if (!insight) {
    return null;
  }
  return {
    profile_signals: {
      values: Math.min(100, Math.max(0, Math.round(data.profile_signals.values))),
      mission: Math.min(100, Math.max(0, Math.round(data.profile_signals.mission))),
      strengths: Math.min(100, Math.max(0, Math.round(data.profile_signals.strengths))),
      constraints: Math.min(100, Math.max(0, Math.round(data.profile_signals.constraints))),
    },
    insight,
  };
}

import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';
import type { DiscoveryMessage } from '@/features/discovery/discovery-types';

export type ReflectionSummary = {
  did_today: string[];
  plan_tomorrow: string[];
  celebration: string;
};

export type ReflectionSummaryMessage = {
  role: 'user' | 'assistant';
  text: string;
};

type ReflectionSummaryResponse = ReflectionSummary & {
  generated_at: string;
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

export function messagesForReflectionSummary(
  messages: DiscoveryMessage[],
  resolveText: (message: DiscoveryMessage) => string,
): ReflectionSummaryMessage[] {
  return messages
    .map((message) => ({
      role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
      text: resolveText(message).trim(),
    }))
    .filter((message) => message.text.length > 0);
}

export async function fetchReflectionSummary(
  userId: string,
  messages: ReflectionSummaryMessage[],
): Promise<ReflectionSummary | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/reflection-summary`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ user_id: userId, messages }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as ReflectionSummaryResponse;
    return {
      did_today: Array.isArray(data.did_today) ? data.did_today : [],
      plan_tomorrow: Array.isArray(data.plan_tomorrow) ? data.plan_tomorrow : [],
      celebration: typeof data.celebration === 'string' ? data.celebration : '',
    };
  } catch {
    return null;
  }
}

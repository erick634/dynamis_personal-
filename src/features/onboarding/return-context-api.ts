import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

export type ReturnContext = {
  returning: boolean;
  lastTopic: string | null;
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

export async function fetchReturnContext(userId: string): Promise<ReturnContext> {
  const response = await fetch(
    `${API_BASE_URL}/profile/${encodeURIComponent(userId)}/return-context`,
    {
      method: 'GET',
      headers: buildAuthHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch return context (${String(response.status)})`);
  }

  const data = (await response.json()) as {
    returning?: unknown;
    last_topic?: unknown;
  };

  return {
    returning: data.returning === true,
    lastTopic:
      typeof data.last_topic === 'string' && data.last_topic.trim() ? data.last_topic.trim() : null,
  };
}

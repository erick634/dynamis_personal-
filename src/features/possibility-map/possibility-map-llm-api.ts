import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';
import type { Dimension } from '@/types/possibility-map';

type PossibilityMapLlmResponse = {
  dimensions: Dimension[];
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

/**
 * Generates Possibility Map dimension copy via backend LLM (Anthropic key stays server-side).
 * Returns null when profile is not ready (404) or on any other failure.
 */
export async function fetchGeneratedMap(userId: string): Promise<Dimension[] | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/possibility-map`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ user_id: userId }),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as PossibilityMapLlmResponse;
    if (!Array.isArray(data.dimensions) || data.dimensions.length === 0) {
      return null;
    }

    return data.dimensions;
  } catch {
    return null;
  }
}

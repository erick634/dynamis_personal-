import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';
import type { DynamisGoal } from '@/types/energeia';

type TransformationPlanLlmResponse = {
  goals: DynamisGoal[];
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
 * Generates Transformation Plan goals via backend LLM (Anthropic key stays server-side).
 * Returns null when profile is not ready (404) or on any other failure.
 */
export async function fetchGeneratedPlan(userId: string): Promise<DynamisGoal[] | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/transformation-plan`, {
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

    const data = (await response.json()) as TransformationPlanLlmResponse;
    if (!Array.isArray(data.goals) || data.goals.length === 0) {
      return null;
    }

    return data.goals;
  } catch {
    return null;
  }
}

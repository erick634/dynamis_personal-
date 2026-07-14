import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

import type {
  WatchtowerCoverageType,
  WatchtowerIntentSpec,
  WatchtowerRecommendation,
  WatchtowerRecommendationsResponse,
} from '@/features/watchtowers/watchtower-types';

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (DYNAMIS_JWT.trim()) {
    headers.Authorization = `Bearer ${DYNAMIS_JWT}`;
  }
  return headers;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function coerceStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

function parseCoverageType(raw: unknown): WatchtowerCoverageType | null {
  const value = asString(raw);
  if (value === 'personal' || value === 'professional') {
    return value;
  }
  return null;
}

function parseIntentSpec(raw: unknown): WatchtowerIntentSpec | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const topic = asString(record.topic);
  const intentSummary = asString(record.intent_summary);
  const evidenceBasis = asString(record.evidence_basis);
  const rationale = asString(record.rationale);
  const suggestedFrequency = asString(record.suggested_frequency);
  if (!topic || !intentSummary || !evidenceBasis || !rationale || !suggestedFrequency) {
    return null;
  }
  return {
    topic,
    intent_summary: intentSummary,
    signals_of_interest: coerceStringArray(record.signals_of_interest),
    suggested_sources: coerceStringArray(record.suggested_sources),
    suggested_frequency: suggestedFrequency,
    evidence_basis: evidenceBasis,
    rationale,
  };
}

function parseRecommendation(raw: unknown): WatchtowerRecommendation | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const coverageType = parseCoverageType(record.coverage_type);
  const displayName = asString(record.display_name);
  const description = asString(record.user_facing_description);
  const intentSpec = parseIntentSpec(record.watchtower_intent_spec);
  const recommendationId = asString(record.recommendation_id);
  const userId = asString(record.user_id);
  if (
    !coverageType ||
    !displayName ||
    !description ||
    !intentSpec ||
    !recommendationId ||
    !userId
  ) {
    return null;
  }
  return {
    recommendation_id: recommendationId,
    user_id: userId,
    coverage_type: coverageType,
    display_name: displayName,
    user_facing_description: description,
    watchtower_intent_spec: intentSpec,
    status: 'proposed',
    generated_at: asString(record.generated_at) || new Date().toISOString(),
  };
}

/**
 * Fetches Watchtower recommendations from the backend LLM endpoint.
 * 200 with empty list is success (including insufficient_profile).
 * Non-OK HTTP / network failures throw so React Query can surface isError.
 * If `recommendations` is not an array, treat as empty (soft degrade) rather than throw.
 */
export async function fetchWatchtowerRecommendations(
  userId: string,
): Promise<WatchtowerRecommendationsResponse> {
  const response = await fetch(`${API_BASE_URL}/watchtower-recommendations`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    throw new Error(`Watchtower recommendations failed (${String(response.status)})`);
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== 'object') {
    throw new Error('Watchtower recommendations returned an invalid payload.');
  }

  const record = data as { recommendations?: unknown; reason?: unknown };
  // Soft-degrade: malformed list → empty array (still a successful HTTP 200 path).
  const rawList = Array.isArray(record.recommendations) ? record.recommendations : [];
  const recommendations = rawList
    .map(parseRecommendation)
    .filter((item): item is WatchtowerRecommendation => item !== null);

  const reason = asString(record.reason) || undefined;

  return { recommendations, reason };
}

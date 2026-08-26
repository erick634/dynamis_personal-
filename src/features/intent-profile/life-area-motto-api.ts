import type { LifeAreaMottoEvidence } from '@/features/intent-profile/life-area-motto-evidence';
import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

export type GenerateLifeAreaMottoInput = {
  userId: string;
  areaId: string;
  areaLabel: string;
  locale: string;
  evidence: LifeAreaMottoEvidence[];
};

type MottoResponse = {
  phrase?: unknown;
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

function fallbackPhrase(areaLabel: string, evidence: LifeAreaMottoEvidence[]): string {
  const reasons = evidence
    .map((item) => item.progressReason.trim())
    .filter((reason) => reason.length > 0)
    .slice(0, 2);
  const first = reasons[0];
  const second = reasons[1];
  if (first === undefined) {
    return '';
  }
  if (second === undefined) {
    return `In ${areaLabel}, you are moving closer through this: ${first}`;
  }
  return `In ${areaLabel}, you are getting closer — ${first}; ${second}.`;
}

export async function generateLifeAreaMotto(
  input: GenerateLifeAreaMottoInput,
): Promise<string | null> {
  const evidence = input.evidence.filter((item) => item.title.trim().length > 0);
  if (evidence.length === 0) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/life-area-motto`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({
        user_id: input.userId,
        area_id: input.areaId,
        area_label: input.areaLabel,
        locale: input.locale,
        evidence: evidence.map((item) => ({
          kind: item.kind,
          title: item.title,
          progress_reason: item.progressReason,
        })),
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as MottoResponse;
      if (typeof data.phrase === 'string' && data.phrase.trim()) {
        return data.phrase.trim();
      }
    }
  } catch {
    // Fall through to local phrase so the UI still updates offline / on API errors.
  }

  const local = fallbackPhrase(input.areaLabel, evidence);
  return local || null;
}

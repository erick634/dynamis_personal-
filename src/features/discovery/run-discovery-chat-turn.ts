import { parseChatSignalsPayload } from '@/features/discovery/discovery-signals-api';
import type { ProfileSignals } from '@/features/discovery/discovery-types';
import { parseLifeAreaGoalSuggestion } from '@/features/intent-profile/parse-life-area-goal-suggestion';
import type { LifeAreaGoalSuggestion } from '@/features/intent-profile/use-life-area-goals';
import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

type RunDiscoveryChatTurnParams = {
  userId: string;
  message: string;
  sessionId: string | null;
};

export type DiscoveryChatTurnResult = {
  reply: string;
  sessionId: string | null;
  profileSignals: ProfileSignals | null;
  insight: string | null;
  lifeAreaGoalSuggestion: LifeAreaGoalSuggestion | null;
};

export async function runDiscoveryChatTurn(
  params: RunDiscoveryChatTurnParams,
): Promise<DiscoveryChatTurnResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (DYNAMIS_JWT.trim()) {
    headers.Authorization = `Bearer ${DYNAMIS_JWT}`;
  }

  const requestBody: Record<string, string> = {
    user_id: params.userId,
    message: params.message,
  };
  if (params.sessionId) {
    requestBody.session_id = params.sessionId;
  }

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`POST /chat failed with status ${String(response.status)}`);
  }

  const data = (await response.json()) as {
    reply?: string;
    session_id?: string;
    profile_signals?: ProfileSignals;
    insight?: string;
    life_area_goal_suggestion?: unknown;
  };

  const signalsPayload = parseChatSignalsPayload(data);

  return {
    reply: data.reply ?? '…',
    sessionId: data.session_id ?? params.sessionId,
    profileSignals: signalsPayload?.profile_signals ?? null,
    insight: signalsPayload?.insight ?? null,
    lifeAreaGoalSuggestion: parseLifeAreaGoalSuggestion(data.life_area_goal_suggestion),
  };
}

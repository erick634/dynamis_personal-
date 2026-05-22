import { API_BASE_URL } from '@/lib/config';

type LiveKitTokenResponse = {
  token: string;
};

/** POST /api/livekit/token — wire when backend is ready (rule 13). */
export async function fetchLiveKitAccessToken(userId: string, roomName: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/livekit/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, room_name: roomName }),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch LiveKit token (${String(response.status)})`);
  }
  const data = (await response.json()) as LiveKitTokenResponse;
  return data.token;
}

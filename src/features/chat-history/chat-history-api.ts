import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

import type {
  ChatSessionDetail,
  ChatSessionMessage,
  ChatSessionSummary,
} from '@/features/chat-history/chat-history-types';

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

function parseSummary(raw: unknown): ChatSessionSummary | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const sessionId = asString(record.session_id);
  if (!sessionId) {
    return null;
  }
  return {
    session_id: sessionId,
    preview: asString(record.preview) || 'Conversation',
    message_count: typeof record.message_count === 'number' ? record.message_count : 0,
    started_at: asString(record.started_at) || new Date(0).toISOString(),
    updated_at: asString(record.updated_at) || new Date(0).toISOString(),
  };
}

function parseMessage(raw: unknown): ChatSessionMessage | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = asString(record.id);
  const role = asString(record.role);
  const text = typeof record.text === 'string' ? record.text : '';
  if (!id || (role !== 'user' && role !== 'agent')) {
    return null;
  }
  return {
    id,
    role,
    text,
    created_at: asString(record.created_at) || new Date(0).toISOString(),
  };
}

export async function fetchChatSessions(userId: string): Promise<ChatSessionSummary[]> {
  const url = new URL(`${API_BASE_URL}/chat/sessions`);
  url.searchParams.set('user_id', userId);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to load chat sessions (${String(response.status)})`);
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object') {
    return [];
  }
  const list = (data as { sessions?: unknown }).sessions;
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(parseSummary).filter((item): item is ChatSessionSummary => item !== null);
}

export async function fetchChatSessionDetail(
  userId: string,
  sessionId: string,
): Promise<ChatSessionDetail> {
  const url = new URL(`${API_BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}`);
  url.searchParams.set('user_id', userId);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to load chat session (${String(response.status)})`);
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid chat session payload.');
  }
  const record = data as { session_id?: unknown; messages?: unknown };
  const messages = Array.isArray(record.messages)
    ? record.messages.map(parseMessage).filter((item): item is ChatSessionMessage => item !== null)
    : [];
  return {
    session_id: asString(record.session_id) || sessionId,
    messages,
  };
}

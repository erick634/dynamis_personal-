import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

import type {
  LifeAreaShareComment,
  LifeAreaShareCommentTarget,
  LifeAreaSharePayload,
  LifeAreaSharePublicResponse,
  LifeAreaShareResponse,
} from '@/features/share/life-area-share-types';

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (DYNAMIS_JWT.trim()) {
    headers.Authorization = `Bearer ${DYNAMIS_JWT}`;
  }
  return headers;
}

function isLifeAreaSharePayload(value: unknown): value is LifeAreaSharePayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.areaId === 'string' &&
    typeof record.areaLabel === 'string' &&
    typeof record.score === 'number' &&
    Array.isArray(record.goals) &&
    Array.isArray(record.links) &&
    Array.isArray(record.documents) &&
    Array.isArray(record.images)
  );
}

function isLifeAreaShareComment(value: unknown): value is LifeAreaShareComment {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    (record.target_type === 'profile' ||
      record.target_type === 'image' ||
      record.target_type === 'document') &&
    typeof record.author_name === 'string' &&
    typeof record.body === 'string' &&
    typeof record.created_at === 'string'
  );
}

function parseComments(value: unknown): LifeAreaShareComment[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid comments payload from backend.');
  }
  const comments: LifeAreaShareComment[] = [];
  for (const item of value) {
    if (!isLifeAreaShareComment(item)) {
      throw new Error('Invalid comment payload from backend.');
    }
    comments.push(item);
  }
  return comments;
}

export async function createLifeAreaShare(input: {
  userId: string;
  areaId: string;
  payload: LifeAreaSharePayload;
}): Promise<LifeAreaShareResponse> {
  const response = await fetch(`${API_BASE_URL}/life-area-share`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      user_id: input.userId,
      area_id: input.areaId,
      payload: input.payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create life-area share (${String(response.status)})`);
  }

  const data = (await response.json()) as {
    share_token?: unknown;
    area_id?: unknown;
    payload?: unknown;
  };

  if (
    typeof data.share_token !== 'string' ||
    typeof data.area_id !== 'string' ||
    !isLifeAreaSharePayload(data.payload)
  ) {
    throw new Error('Invalid life-area share payload from backend.');
  }

  return {
    share_token: data.share_token,
    area_id: data.area_id,
    payload: data.payload,
  };
}

export class LifeAreaShareNotFoundError extends Error {
  constructor(message = 'Share link not found.') {
    super(message);
    this.name = 'LifeAreaShareNotFoundError';
  }
}

/** Public endpoint — Content-Type only. Never send Authorization or user_id. */
export async function fetchPublicLifeAreaShare(
  token: string,
): Promise<LifeAreaSharePublicResponse> {
  const response = await fetch(`${API_BASE_URL}/share/area/${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 404) {
    throw new LifeAreaShareNotFoundError();
  }
  if (!response.ok) {
    throw new Error(`Failed to load shared life area (${String(response.status)})`);
  }

  const data = (await response.json()) as {
    share_token?: unknown;
    payload?: unknown;
  };

  if (typeof data.share_token !== 'string' || !isLifeAreaSharePayload(data.payload)) {
    throw new Error('Invalid public life-area share payload from backend.');
  }

  return {
    share_token: data.share_token,
    payload: data.payload,
  };
}

export async function fetchPublicLifeAreaShareComments(
  token: string,
): Promise<LifeAreaShareComment[]> {
  const response = await fetch(`${API_BASE_URL}/share/area/${encodeURIComponent(token)}/comments`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 404) {
    throw new LifeAreaShareNotFoundError();
  }
  if (!response.ok) {
    throw new Error(`Failed to load comments (${String(response.status)})`);
  }

  const data = (await response.json()) as { comments?: unknown };
  return parseComments(data.comments);
}

export async function postPublicLifeAreaShareComment(input: {
  token: string;
  authorName: string;
  body: string;
  targetType: LifeAreaShareCommentTarget;
  targetKey?: string | null;
}): Promise<LifeAreaShareComment> {
  const response = await fetch(
    `${API_BASE_URL}/share/area/${encodeURIComponent(input.token)}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author_name: input.authorName,
        body: input.body,
        target_type: input.targetType,
        target_key: input.targetKey ?? null,
      }),
    },
  );

  if (response.status === 404) {
    throw new LifeAreaShareNotFoundError();
  }
  if (!response.ok) {
    throw new Error(`Failed to post comment (${String(response.status)})`);
  }

  const data = (await response.json()) as { comment?: unknown };
  if (!isLifeAreaShareComment(data.comment)) {
    throw new Error('Invalid comment payload from backend.');
  }
  return data.comment;
}

export async function fetchOwnerLifeAreaShareComments(input: {
  userId: string;
  areaId: string;
}): Promise<LifeAreaShareComment[]> {
  const params = new URLSearchParams({
    user_id: input.userId,
    area_id: input.areaId,
  });
  const response = await fetch(`${API_BASE_URL}/life-area-share/comments?${params.toString()}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to load owner comments (${String(response.status)})`);
  }

  const data = (await response.json()) as { comments?: unknown };
  return parseComments(data.comments);
}

export function buildLifeAreaShareUrl(token: string): string {
  return `${window.location.origin}/share/area/${token}`;
}

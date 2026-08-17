import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

import type { PortfolioItem, PortfolioLink } from '@/features/portfolio/portfolio-types';
import { isPortfolioItemRow } from '@/features/portfolio/portfolio-types';

type PortfolioListEnvelope = {
  items: unknown;
};

type PortfolioItemEnvelope = {
  item: unknown;
};

export type CreatePortfolioItemPayload = {
  user_id: string;
  title: string;
  description?: string | null;
  contribution?: string | null;
  links?: PortfolioLink[];
  profile_ids?: string[];
};

export type UpdatePortfolioItemPatch = {
  title?: string;
  description?: string | null;
  contribution?: string | null;
  links?: PortfolioLink[];
  profile_ids?: string[];
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

function parsePortfolioItem(payload: unknown, context: string): PortfolioItem {
  const data = payload as PortfolioItemEnvelope;
  if (!isPortfolioItemRow(data.item)) {
    throw new Error(`Invalid portfolio item payload from backend (${context}).`);
  }
  return data.item;
}

export async function listPortfolioItems(userId: string): Promise<PortfolioItem[]> {
  const response = await fetch(`${API_BASE_URL}/portfolio?user_id=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to list portfolio items (${String(response.status)})`);
  }
  const data = (await response.json()) as PortfolioListEnvelope;
  if (!Array.isArray(data.items)) {
    throw new Error('Invalid portfolio payload from backend.');
  }
  const items: PortfolioItem[] = [];
  for (const item of data.items) {
    if (!isPortfolioItemRow(item)) {
      throw new Error('Invalid portfolio item payload from backend.');
    }
    items.push(item);
  }
  return items;
}

export async function createPortfolioItem(
  payload: CreatePortfolioItemPayload,
): Promise<PortfolioItem> {
  const response = await fetch(`${API_BASE_URL}/portfolio`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create portfolio item (${String(response.status)})`);
  }
  return parsePortfolioItem(await response.json(), 'create');
}

export async function updatePortfolioItem(
  id: string,
  patch: UpdatePortfolioItemPatch,
): Promise<PortfolioItem> {
  const response = await fetch(`${API_BASE_URL}/portfolio/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: buildAuthHeaders(),
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw new Error(`Failed to update portfolio item (${String(response.status)})`);
  }
  return parsePortfolioItem(await response.json(), 'update');
}

export async function deletePortfolioItem(id: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/portfolio/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete portfolio item (${String(response.status)})`);
  }
}

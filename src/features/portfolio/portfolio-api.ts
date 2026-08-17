import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

import type { PortfolioItem } from '@/features/portfolio/portfolio-types';
import { isPortfolioItemRow } from '@/features/portfolio/portfolio-types';

type PortfolioListEnvelope = {
  items: unknown;
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

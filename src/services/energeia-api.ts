import type { EnergeiaMarkRequest } from '@/types/energeia';

import { API_BASE_URL } from '@/lib/config';

export async function markEnergeia(request: EnergeiaMarkRequest): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/energeia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Failed to mark energeia (${String(response.status)})`);
  }
}

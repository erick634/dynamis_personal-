import { API_BASE_URL } from '@/lib/config';

export type PublicShareProfile = {
  title: string;
  context: string | null;
  confidence: number;
};

export type PublicSharePortfolioItem = {
  title: string;
  description: string | null;
  contribution: string | null;
  links: Array<{ label: string; url: string }>;
};

export type PublicShareData = {
  profile: PublicShareProfile;
  portfolio: PublicSharePortfolioItem[];
};

export class ShareNotFoundError extends Error {
  constructor(message = 'Share link not found.') {
    super(message);
    this.name = 'ShareNotFoundError';
  }
}

function isPublicShareData(value: unknown): value is PublicShareData {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (!record.profile || typeof record.profile !== 'object') return false;
  if (!Array.isArray(record.portfolio)) return false;
  const profile = record.profile as Record<string, unknown>;
  return typeof profile.title === 'string' && typeof profile.confidence === 'number';
}

/** Public endpoint — Content-Type only. Never send Authorization or user_id. */
export async function fetchPublicShare(token: string): Promise<PublicShareData> {
  const response = await fetch(`${API_BASE_URL}/share/${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 404) {
    throw new ShareNotFoundError();
  }
  if (!response.ok) {
    throw new Error(`Failed to load shared profile (${String(response.status)})`);
  }

  const data: unknown = await response.json();
  if (!isPublicShareData(data)) {
    throw new Error('Invalid public share payload from backend.');
  }
  return data;
}

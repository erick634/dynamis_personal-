import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (DYNAMIS_JWT.trim()) {
    headers.Authorization = `Bearer ${DYNAMIS_JWT}`;
  }
  return headers;
}

export type ProfileEmailLookup = {
  userId: string;
  email: string;
  displayName: string | null;
};

type LookupEnvelope = {
  profile: {
    user_id: string;
    email: string;
    display_name: string | null;
  } | null;
};

export async function saveProfileEmail(options: {
  userId: string;
  email: string;
  displayName?: string;
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/profile/email`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      user_id: options.userId,
      email: options.email.trim().toLowerCase(),
      ...(options.displayName ? { display_name: options.displayName } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save email (${String(response.status)})`);
  }
}

export async function lookupProfileByEmail(email: string): Promise<ProfileEmailLookup | null> {
  const response = await fetch(`${API_BASE_URL}/auth/lookup-by-email`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });

  if (!response.ok) {
    throw new Error(`Failed to look up profile (${String(response.status)})`);
  }

  const data = (await response.json()) as LookupEnvelope;
  if (!data.profile) {
    return null;
  }

  const userId = data.profile.user_id.trim();
  const resolvedEmail = data.profile.email.trim();
  if (!userId || !resolvedEmail) {
    throw new Error('Invalid profile payload from backend.');
  }

  return {
    userId,
    email: resolvedEmail,
    displayName: data.profile.display_name?.trim() || null,
  };
}

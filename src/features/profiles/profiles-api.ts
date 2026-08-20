import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

import type { Profile } from '@/features/profiles/profiles-types';
import { isProfileRow } from '@/features/profiles/profiles-types';

type ProfilesListEnvelope = {
  profiles: unknown;
};

type ProfileEnvelope = {
  profile: unknown;
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

export async function listProfiles(userId: string): Promise<Profile[]> {
  const response = await fetch(`${API_BASE_URL}/profiles?user_id=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to list profiles (${String(response.status)})`);
  }

  const data = (await response.json()) as ProfilesListEnvelope;
  if (!Array.isArray(data.profiles)) {
    throw new Error('Invalid profiles payload from backend.');
  }

  const profiles: Profile[] = [];
  for (const item of data.profiles) {
    if (!isProfileRow(item)) {
      throw new Error('Invalid profile payload from backend.');
    }
    profiles.push(item);
  }
  return profiles;
}

export async function updateProfile(
  id: string,
  patch: { title?: string; context?: string | null },
): Promise<Profile> {
  const response = await fetch(`${API_BASE_URL}/profiles/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: buildAuthHeaders(),
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error(`Failed to update profile (${String(response.status)})`);
  }

  const data = (await response.json()) as ProfileEnvelope;
  if (!isProfileRow(data.profile)) {
    throw new Error('Invalid profile payload from backend.');
  }
  return data.profile;
}

export async function setPrimaryProfile(id: string, userId: string): Promise<Profile> {
  const response = await fetch(`${API_BASE_URL}/profiles/${encodeURIComponent(id)}/primary`, {
    method: 'PATCH',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to set primary profile (${String(response.status)})`);
  }

  const data = (await response.json()) as ProfileEnvelope;
  if (!isProfileRow(data.profile)) {
    throw new Error('Invalid profile payload from backend.');
  }
  return data.profile;
}

export async function generateShareLink(profileId: string, userId: string): Promise<Profile> {
  const response = await fetch(`${API_BASE_URL}/profiles/${encodeURIComponent(profileId)}/share`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate share link (${String(response.status)})`);
  }

  const data = (await response.json()) as ProfileEnvelope;
  if (!isProfileRow(data.profile)) {
    throw new Error('Invalid profile payload from backend.');
  }
  return data.profile;
}

export async function revokeShareLink(profileId: string, userId: string): Promise<Profile> {
  const response = await fetch(`${API_BASE_URL}/profiles/${encodeURIComponent(profileId)}/share`, {
    method: 'DELETE',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to revoke share link (${String(response.status)})`);
  }

  const data = (await response.json()) as ProfileEnvelope;
  if (!isProfileRow(data.profile)) {
    throw new Error('Invalid profile payload from backend.');
  }
  return data.profile;
}

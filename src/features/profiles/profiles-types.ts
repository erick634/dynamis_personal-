export type Profile = {
  id: string;
  user_id: string;
  title: string;
  context: string | null;
  confidence: number;
  is_primary: boolean;
  source: string;
  created_at: string;
  updated_at: string;
  share_token: string | null;
  is_public: boolean;
};

export function isProfileRow(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    record.id.trim().length > 0 &&
    typeof record.user_id === 'string' &&
    record.user_id.trim().length > 0
  );
}

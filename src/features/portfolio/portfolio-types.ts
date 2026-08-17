export type PortfolioLink = {
  label: string;
  url: string;
};

export type PortfolioItem = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  contribution: string | null;
  links: PortfolioLink[];
  profile_ids: string[];
  created_at: string;
  updated_at: string;
};

export function isPortfolioItemRow(value: unknown): value is PortfolioItem {
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

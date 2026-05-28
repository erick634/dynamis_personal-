import type { TodayCouncil } from '@/types/council';

/** Canonical demo council session (rule 12). */
export const MOCK_TODAY_COUNCIL: TodayCouncil = {
  userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  updatedAt: new Date().toISOString(),
  agents: [
    { id: 'dynamis', status: 'suggested' },
    { id: 'health', status: 'suggested' },
    { id: 'navigator', status: 'suggested' },
    { id: 'purpose', status: 'aligned' },
  ],
};

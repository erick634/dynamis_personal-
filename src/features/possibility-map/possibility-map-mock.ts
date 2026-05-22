import { DEMO_USER_ID } from '@/lib/config';
import type { PossibilityMap } from '@/types/possibility-map';

/** Canonical demo dimensions — do not add beyond these four (rule 12). */
export const MOCK_POSSIBILITY_MAP: PossibilityMap = {
  userId: DEMO_USER_ID,
  updatedAt: '2026-05-21T12:00:00.000Z',
  dimensions: [
    {
      id: 'aiDisruption',
      name: 'AI Disruption',
      leveragePercent: 340,
      description: '',
      icon: 'cpu',
    },
    {
      id: 'careerReinvention',
      name: 'Career Reinvention',
      leveragePercent: 220,
      description: '',
      icon: 'briefcase',
    },
    {
      id: 'health',
      name: 'Health',
      leveragePercent: 180,
      description: '',
      icon: 'heart',
    },
    {
      id: 'purpose',
      name: 'Purpose',
      leveragePercent: 260,
      description: '',
      icon: 'compass',
    },
  ],
};

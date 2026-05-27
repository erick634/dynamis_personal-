import { DEMO_USER_ID } from '@/lib/config';
import type { PossibilityMap } from '@/types/possibility-map';

/** Climate Adaptation persona — canonical demo dataset (rule 12). */
export const climateAdaptationMockMap: PossibilityMap = {
  userId: DEMO_USER_ID,
  updatedAt: new Date().toISOString(),
  dimensions: [
    {
      id: 'aiDisruption',
      name: 'Navigating AI Disruption',
      leveragePercent: 340,
      description:
        'Climate work historically required teams. AI now lets one synthesist with conviction operate at the leverage of ten.',
      icon: 'brain',
    },
    {
      id: 'careerReinvention',
      name: 'Career Reinvention',
      leveragePercent: 220,
      description:
        'From climate adjacent to climate central. The capability gap that took a decade now closes in months.',
      icon: 'briefcase',
    },
    {
      id: 'healthLongevity',
      name: 'Health & Longevity',
      leveragePercent: 180,
      description:
        'Decade-long energy curve, not annual. Sleep, recovery, and cognition treated as compounding assets.',
      icon: 'heart',
    },
    {
      id: 'purposeMeaning',
      name: 'Purpose & Meaning',
      leveragePercent: 260,
      description:
        "Work that closes the activation gap — making climate obvious for people who don't see themselves as climate people.",
      icon: 'compass',
    },
  ],
};

/** @deprecated Use climateAdaptationMockMap */
export const MOCK_POSSIBILITY_MAP = climateAdaptationMockMap;

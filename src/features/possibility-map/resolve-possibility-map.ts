import { deriveMapFromProfile } from '@/features/possibility-map/derive-map-from-profile';
import { climateAdaptationMockMap } from '@/features/possibility-map/possibility-map-mock';
import {
  isProfileReadyForMap,
  profileMapFingerprint,
} from '@/features/possibility-map/profile-map-fingerprint';
import type { IntentProfile } from '@/features/you/intent-profile-types';
import type { Dimension, PossibilityMap } from '@/types/possibility-map';

const DIMENSION_IDS = [
  'aiDisruption',
  'careerReinvention',
  'healthLongevity',
  'purposeMeaning',
] as const;

const ICON_BY_ID: Record<(typeof DIMENSION_IDS)[number], Dimension['icon']> = {
  aiDisruption: 'brain',
  careerReinvention: 'briefcase',
  healthLongevity: 'heart',
  purposeMeaning: 'compass',
};

const NAME_BY_ID: Record<(typeof DIMENSION_IDS)[number], string> = {
  aiDisruption: 'Navigating AI Disruption',
  careerReinvention: 'Career Reinvention',
  healthLongevity: 'Health & Longevity',
  purposeMeaning: 'Purpose & Meaning',
};

export type MapResolutionSource = 'llm' | 'derived' | 'mock';

export function mergeLlmWithDerived(
  llmDimensions: Dimension[],
  profile: IntentProfile,
): Dimension[] {
  const derived = deriveMapFromProfile(profile);
  const derivedById = new Map(derived.dimensions.map((dimension) => [dimension.id, dimension]));

  return DIMENSION_IDS.map((id) => {
    const fromLlm = llmDimensions.find((dimension) => dimension.id === id);
    const fallback = derivedById.get(id);
    if (!fromLlm && !fallback) {
      throw new Error(`Missing dimension ${id}`);
    }
    if (!fromLlm) {
      if (!fallback) {
        throw new Error(`Missing dimension ${id}`);
      }
      return fallback;
    }

    const description =
      fromLlm.description.trim().length > 0
        ? fromLlm.description.trim()
        : (fallback?.description ?? fromLlm.description);

    const leveragePercent =
      Number.isFinite(fromLlm.leveragePercent) && fromLlm.leveragePercent >= 120
        ? fromLlm.leveragePercent
        : (fallback?.leveragePercent ?? fromLlm.leveragePercent);

    return {
      id,
      name: fromLlm.name.trim() || fallback?.name || NAME_BY_ID[id],
      description,
      leveragePercent,
      icon: ICON_BY_ID[id],
    };
  });
}

export function resolvePossibilityMapData({
  userId,
  profile,
  llmDimensions,
}: {
  userId: string | undefined;
  profile: IntentProfile | null;
  llmDimensions: Dimension[] | null | undefined;
}): { map: PossibilityMap; source: MapResolutionSource; fingerprint: string | null } {
  if (profile && isProfileReadyForMap(profile)) {
    const fingerprint = profileMapFingerprint(profile);

    if (llmDimensions != null && llmDimensions.length > 0) {
      return {
        map: {
          userId: profile.userId,
          updatedAt: new Date().toISOString(),
          dimensions: mergeLlmWithDerived(llmDimensions, profile),
        },
        source: 'llm',
        fingerprint,
      };
    }

    return {
      map: deriveMapFromProfile(profile),
      source: 'derived',
      fingerprint,
    };
  }

  return {
    map: {
      ...climateAdaptationMockMap,
      userId: userId ?? climateAdaptationMockMap.userId,
    },
    source: 'mock',
    fingerprint: null,
  };
}

export function averageLeveragePercent(dimensions: Dimension[]): number {
  if (dimensions.length === 0) {
    return 200;
  }
  const sum = dimensions.reduce((acc, dimension) => acc + dimension.leveragePercent, 0);
  return Math.round(sum / dimensions.length);
}

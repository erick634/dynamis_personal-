import type { TFunction } from 'i18next';

import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';

/** Prefer a generated moral when present; otherwise the theme line for that life area. */
export function resolveLifeAreaMotto(
  areaId: LifeAreaId,
  storedPhrase: string,
  t: TFunction,
): string {
  const custom = storedPhrase.trim();
  if (custom) return custom;
  return t(`you.lifeArea.themeMotto.${areaId}`);
}

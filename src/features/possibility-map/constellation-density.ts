import type { Dimension } from '@/types/possibility-map';
import { averageLeveragePercent } from '@/features/possibility-map/resolve-possibility-map';

export type ConstellationDensity = {
  dynamisVisibleNodes: number;
  energeiaVisibleNodes: number;
  energeiaAccentNodes: number;
};

export function densityFromDimensions(dimensions: Dimension[]): ConstellationDensity {
  const average = averageLeveragePercent(dimensions);
  const expansion = Math.min(1, Math.max(0, (average - 120) / (400 - 120)));

  const dynamisVisibleNodes = Math.max(8, Math.round(15 - expansion * 7));
  const energeiaVisibleNodes = Math.max(18, Math.round(22 + expansion * 10));
  const energeiaAccentNodes = Math.max(3, Math.round(3 + expansion * 5));

  return {
    dynamisVisibleNodes,
    energeiaVisibleNodes,
    energeiaAccentNodes,
  };
}

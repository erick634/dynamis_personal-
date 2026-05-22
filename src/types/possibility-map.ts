export type DimensionIcon = 'cpu' | 'briefcase' | 'heart' | 'compass';

export type DimensionId = 'aiDisruption' | 'careerReinvention' | 'health' | 'purpose';

export type Dimension = {
  id: DimensionId;
  name: string;
  leveragePercent: number;
  description: string;
  icon: DimensionIcon;
};

export type PossibilityMap = {
  userId: string;
  dimensions: Dimension[];
  updatedAt: string;
};

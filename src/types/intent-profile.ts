export type ProfileDimension = 'values' | 'mission' | 'strengths' | 'constraints';

export type IntentProfile = {
  userId: string;
  displayName?: string;
  mission: string;
  values: string[];
  strengths: string[];
  patternsToWatch: string[];
  vision: string;
  confidence: number;
  updatedAt: string;
};

export type ProfileSignal = {
  dimension: ProfileDimension;
  delta: number;
};

export type PlanPriority = 'high' | 'normal';

export type PlanTagKind = 'research' | 'build' | 'reflect';

export type DynamisGoal = {
  id: string;
  realized: boolean;
  priority: PlanPriority;
  tag: PlanTagKind;
  /** i18n key suffix under transformationPlan.schedule.* */
  dueLabelKey?: 'todayAt' | 'tomorrow' | 'wed' | 'fri';
  realizedAt: string | null;
};

export type Energeia = {
  goalId: string;
  realizedAt: string;
};

export type EnergeiaGoal = {
  id: string;
  title: string;
  realizedAt: string | null;
};

export type EnergeiaMarkRequest = {
  userId: string;
  goalId: string;
};

import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';

export type LifeAreaGoal = {
  id: string;
  titleKey: string;
  done: boolean;
};

export type LifeAreaDetail = {
  summaryKey: string;
  goals: LifeAreaGoal[];
  growingTagKeys: string[];
};

/** Mock detail content until each life area has a full Profile + goals store. */
export const LIFE_AREA_DETAILS: Record<LifeAreaId, LifeAreaDetail> = {
  professional: {
    summaryKey: 'you.lifeArea.details.professional.summary',
    goals: [
      { id: 'p1', titleKey: 'you.lifeArea.details.professional.goals.g1', done: false },
      { id: 'p2', titleKey: 'you.lifeArea.details.professional.goals.g2', done: true },
      { id: 'p3', titleKey: 'you.lifeArea.details.professional.goals.g3', done: true },
    ],
    growingTagKeys: [
      'you.lifeArea.details.professional.tags.t1',
      'you.lifeArea.details.professional.tags.t2',
      'you.lifeArea.details.professional.tags.t3',
    ],
  },
  health: {
    summaryKey: 'you.lifeArea.details.health.summary',
    goals: [
      { id: 'h1', titleKey: 'you.lifeArea.details.health.goals.g1', done: false },
      { id: 'h2', titleKey: 'you.lifeArea.details.health.goals.g2', done: false },
      { id: 'h3', titleKey: 'you.lifeArea.details.health.goals.g3', done: true },
    ],
    growingTagKeys: ['you.lifeArea.details.health.tags.t1', 'you.lifeArea.details.health.tags.t2'],
  },
  studies: {
    summaryKey: 'you.lifeArea.details.studies.summary',
    goals: [
      { id: 's1', titleKey: 'you.lifeArea.details.studies.goals.g1', done: true },
      { id: 's2', titleKey: 'you.lifeArea.details.studies.goals.g2', done: false },
    ],
    growingTagKeys: [
      'you.lifeArea.details.studies.tags.t1',
      'you.lifeArea.details.studies.tags.t2',
    ],
  },
  spirituality: {
    summaryKey: 'you.lifeArea.details.spirituality.summary',
    goals: [
      { id: 'sp1', titleKey: 'you.lifeArea.details.spirituality.goals.g1', done: false },
      { id: 'sp2', titleKey: 'you.lifeArea.details.spirituality.goals.g2', done: false },
    ],
    growingTagKeys: ['you.lifeArea.details.spirituality.tags.t1'],
  },
  leisure: {
    summaryKey: 'you.lifeArea.details.leisure.summary',
    goals: [
      { id: 'l1', titleKey: 'you.lifeArea.details.leisure.goals.g1', done: true },
      { id: 'l2', titleKey: 'you.lifeArea.details.leisure.goals.g2', done: false },
    ],
    growingTagKeys: [
      'you.lifeArea.details.leisure.tags.t1',
      'you.lifeArea.details.leisure.tags.t2',
    ],
  },
  family: {
    summaryKey: 'you.lifeArea.details.family.summary',
    goals: [
      { id: 'f1', titleKey: 'you.lifeArea.details.family.goals.g1', done: false },
      { id: 'f2', titleKey: 'you.lifeArea.details.family.goals.g2', done: true },
    ],
    growingTagKeys: ['you.lifeArea.details.family.tags.t1'],
  },
  economy: {
    summaryKey: 'you.lifeArea.details.economy.summary',
    goals: [
      { id: 'e1', titleKey: 'you.lifeArea.details.economy.goals.g1', done: false },
      { id: 'e2', titleKey: 'you.lifeArea.details.economy.goals.g2', done: false },
    ],
    growingTagKeys: [
      'you.lifeArea.details.economy.tags.t1',
      'you.lifeArea.details.economy.tags.t2',
    ],
  },
};

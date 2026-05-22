import type { DynamisGoal } from '@/types/energeia';

/** Canonical demo plan items (rule 12) — five goals only. */
export const MOCK_PLAN_GOALS: DynamisGoal[] = [
  {
    id: 'mapGaps',
    realized: true,
    priority: 'normal',
    tag: 'research',
    realizedAt: '2026-05-20T10:00:00.000Z',
  },
  {
    id: 'interview',
    realized: false,
    priority: 'high',
    tag: 'research',
    dueLabelKey: 'todayAt',
    realizedAt: null,
  },
  {
    id: 'draftHypothesis',
    realized: false,
    priority: 'normal',
    tag: 'build',
    dueLabelKey: 'tomorrow',
    realizedAt: null,
  },
  {
    id: 'synthesis',
    realized: false,
    priority: 'normal',
    tag: 'reflect',
    dueLabelKey: 'wed',
    realizedAt: null,
  },
  {
    id: 'shipPost',
    realized: false,
    priority: 'high',
    tag: 'build',
    dueLabelKey: 'fri',
    realizedAt: null,
  },
];

export type GamificationMission = {
  id: string;
  title: string;
  current: number;
  target: number;
  xp: number;
  status: 'done' | 'today';
};

export type GamificationTrail = {
  id: string;
  name: string;
  pct: number;
  tone: 'moss' | 'ember';
};

export type TodayGamification = {
  userInitial: string;
  level: number;
  xpCurrent: number;
  xpToNext: number;
  missions: GamificationMission[];
  trails: GamificationTrail[];
};

// Mock data — to be replaced by backend endpoint (Robson) later.
export const MOCK_TODAY_GAMIFICATION: TodayGamification = {
  userInitial: 'E',
  level: 12,
  xpCurrent: 650,
  xpToNext: 800,
  missions: [
    {
      id: 'm1',
      title: 'Conduct 1 specialist interview',
      current: 1,
      target: 1,
      xp: 30,
      status: 'done',
    },
    { id: 'm2', title: "Write today's insight", current: 0, target: 1, xp: 20, status: 'today' },
  ],
  trails: [
    { id: 't1', name: 'Career Discovery', pct: 72, tone: 'moss' },
    { id: 't2', name: 'Drag Reduction', pct: 40, tone: 'ember' },
  ],
};

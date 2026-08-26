export type LifeAreaShareGoalStatus = 'new' | 'behind' | 'partial' | 'onTrack';

export type LifeAreaShareGoal = {
  title: string;
  percent: number;
  completed: number;
  total: number;
  status: LifeAreaShareGoalStatus;
  isAchievement: boolean;
  tasks: Array<{ title: string; cadence: string }>;
};

export type LifeAreaSharePayload = {
  areaId: string;
  areaLabel: string;
  summary: string;
  motto: string;
  score: number;
  displayName: string | null;
  goals: LifeAreaShareGoal[];
  links: Array<{ id: string; label: string; url: string }>;
  documents: Array<{ id: string; name: string; url: string }>;
  images: Array<{ id: string; name: string; dataUrl: string }>;
};

export type LifeAreaShareResponse = {
  share_token: string;
  area_id: string;
  payload: LifeAreaSharePayload;
};

export type LifeAreaSharePublicResponse = {
  share_token: string;
  payload: LifeAreaSharePayload;
};

export type LifeAreaShareCommentTarget = 'profile' | 'image' | 'document';

export type LifeAreaShareComment = {
  id: string;
  target_type: LifeAreaShareCommentTarget;
  target_key: string | null;
  target_label: string | null;
  author_name: string;
  body: string;
  created_at: string;
};

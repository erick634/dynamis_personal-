export type WatchtowerCoverageType = 'personal' | 'professional';

export type WatchtowerIntentSpec = {
  topic: string;
  intent_summary: string;
  signals_of_interest: string[];
  suggested_sources: string[];
  suggested_frequency: string;
  /** 24h HH:MM — suggested daily reminder clock time for the cadence. */
  suggested_reminder_time: string;
  evidence_basis: string;
  rationale: string;
};

export type WatchtowerRecommendation = {
  recommendation_id: string;
  user_id: string;
  coverage_type: WatchtowerCoverageType;
  display_name: string;
  user_facing_description: string;
  watchtower_intent_spec: WatchtowerIntentSpec;
  status: 'proposed';
  generated_at: string;
};

export type WatchtowerRecommendationsResponse = {
  recommendations: WatchtowerRecommendation[];
  reason?: string;
};

export type WatchtowerReminderPrefs = {
  reminderEnabled: boolean;
  alarmEnabled: boolean;
  reminderTime: string;
};

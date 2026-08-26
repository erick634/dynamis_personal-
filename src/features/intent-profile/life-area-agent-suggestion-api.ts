import { API_BASE_URL, DYNAMIS_JWT } from '@/lib/config';

import type {
  FetchLifeAreaSuggestionInput,
  LifeAreaAgentSuggestion,
  LifeAreaSuggestionGoal,
  LifeAreaSuggestionResource,
  LifeAreaSuggestionTask,
} from '@/features/intent-profile/life-area-agent-suggestion-types';
import type {
  GoalHorizonMonths,
  TaskSchedule,
  Weekday,
} from '@/features/intent-profile/life-area-goals-types';
import { GOAL_HORIZON_MONTHS } from '@/features/intent-profile/life-area-goals-types';

type SuggestionEnvelope = {
  suggestion?: unknown;
};

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (DYNAMIS_JWT.trim()) {
    headers.Authorization = `Bearer ${DYNAMIS_JWT}`;
  }
  return headers;
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseHorizon(raw: unknown): GoalHorizonMonths {
  const value = Number(raw);
  if ((GOAL_HORIZON_MONTHS as readonly number[]).includes(value)) {
    return value as GoalHorizonMonths;
  }
  return 3;
}

function parseDuration(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > 24 * 60) return null;
  return value;
}

function parseSchedule(row: Record<string, unknown>): TaskSchedule | null {
  const cadence = asTrimmed(row.cadence);
  const time = row.time === null || typeof row.time === 'string' ? row.time : null;
  const normalizedTime = time && /^\d{2}:\d{2}$/.test(time.trim()) ? time.trim() : null;

  if (cadence === 'daily') {
    return {
      cadence: 'daily',
      time: normalizedTime,
      includeWeekends: Boolean(row.include_weekends ?? row.includeWeekends ?? false),
    };
  }
  if (cadence === 'weekly') {
    const weekday = Number(row.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
    return { cadence: 'weekly', weekday: weekday as Weekday, time: normalizedTime };
  }
  if (cadence === 'monthly') {
    const dayOfMonth = Number(row.day_of_month ?? row.dayOfMonth);
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return null;
    return { cadence: 'monthly', dayOfMonth, time: normalizedTime };
  }
  return null;
}

function parseTask(raw: unknown): LifeAreaSuggestionTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const title = asTrimmed(row.title);
  if (!title) return null;
  const schedule = parseSchedule(row);
  if (!schedule) return null;
  return {
    title,
    schedule,
    durationMinutes: parseDuration(row.duration_minutes ?? row.durationMinutes),
  };
}

function parseResource(raw: unknown): LifeAreaSuggestionResource | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const kind = asTrimmed(row.kind);
  if (kind !== 'book' && kind !== 'site' && kind !== 'youtube') return null;
  const title = asTrimmed(row.title);
  const url = asTrimmed(row.url);
  if (!title || !url || !/^https?:\/\//i.test(url)) return null;
  return {
    kind,
    title,
    url,
    why: asTrimmed(row.why),
  };
}

function parseGoal(raw: unknown): LifeAreaSuggestionGoal | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const mode = asTrimmed(row.mode) === 'existing' ? 'existing' : 'new';
  const title = asTrimmed(row.title);
  const existingGoalTitle = asTrimmed(row.existing_goal_title ?? row.existingGoalTitle) || null;
  const tasksRaw = Array.isArray(row.tasks) ? row.tasks : [];
  const tasks = tasksRaw
    .map(parseTask)
    .filter((task): task is LifeAreaSuggestionTask => task != null)
    .slice(0, 5);
  if (tasks.length === 0) return null;
  if (mode === 'new' && !title) return null;
  if (mode === 'existing' && !existingGoalTitle && !title) return null;

  return {
    mode,
    title: title || existingGoalTitle || 'Goal',
    existingGoalTitle: mode === 'existing' ? (existingGoalTitle ?? title) : null,
    horizonMonths: parseHorizon(row.horizon_months ?? row.horizonMonths),
    tasks,
  };
}

export function parseLifeAreaAgentSuggestion(raw: unknown): LifeAreaAgentSuggestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const goal = parseGoal(record.goal);
  const resourcesRaw = Array.isArray(record.resources) ? record.resources : [];
  const resources = resourcesRaw
    .map(parseResource)
    .filter((item): item is LifeAreaSuggestionResource => item != null)
    .slice(0, 3);
  if (!goal && resources.length === 0) return null;
  return {
    rationale: asTrimmed(record.rationale),
    goal,
    resources,
  };
}

export async function fetchLifeAreaAgentSuggestion(
  input: FetchLifeAreaSuggestionInput,
): Promise<LifeAreaAgentSuggestion | null> {
  const response = await fetch(`${API_BASE_URL}/life-area-suggestion`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      user_id: input.userId,
      area_id: input.areaId,
      area_label: input.areaLabel,
      locale: input.locale,
      summary: input.summary,
      motto: input.motto,
      profile_focus: input.profileFocus,
      existing_goals: input.existingGoals,
      existing_links: input.existingLinks,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch life-area suggestion (${String(response.status)})`);
  }

  const data = (await response.json()) as SuggestionEnvelope;
  if (data.suggestion == null) return null;
  return parseLifeAreaAgentSuggestion(data.suggestion);
}

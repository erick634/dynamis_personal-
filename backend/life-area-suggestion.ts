const AREA_IDS = [
  'professional',
  'health',
  'studies',
  'spirituality',
  'leisure',
  'family',
  'economy',
] as const;

const RESOURCE_KINDS = ['book', 'site', 'youtube'] as const;
const CADENCES = ['daily', 'weekly', 'monthly'] as const;
const HORIZONS = [1, 3, 6, 12] as const;

class LifeAreaSuggestionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LifeAreaSuggestionValidationError';
  }
}

type ResourceKind = (typeof RESOURCE_KINDS)[number];
type Cadence = (typeof CADENCES)[number];

type SuggestionTask = {
  title: string;
  cadence: Cadence;
  time: string | null;
  weekday: number | null;
  day_of_month: number | null;
  include_weekends: boolean;
  duration_minutes: number | null;
};

type SuggestionResource = {
  kind: ResourceKind;
  title: string;
  url: string;
  why: string;
};

type SuggestionGoal = {
  mode: 'new' | 'existing';
  title: string;
  existing_goal_title: string | null;
  horizon_months: number;
  tasks: SuggestionTask[];
};

type LifeAreaSuggestionResult = {
  rationale: string;
  goal: SuggestionGoal | null;
  resources: SuggestionResource[];
};

type SuggestionRequestContext = {
  user_id: string;
  area_id: string;
  area_label: string;
  locale: string;
  summary: string;
  motto: string;
  existing_goals: Array<{ title: string; tasks: string[] }>;
  existing_links: Array<{ label: string; url: string }>;
  profile_focus: string;
};

const LIFE_AREA_SUGGESTION_SYSTEM_PROMPT = [
  'You are the Unlock Lead Guide. Suggest concrete next steps for ONE life area.',
  'Return ONLY valid JSON (no markdown) with this shape:',
  '{',
  '  "rationale": "1–2 sentences why these suggestions fit",',
  '  "goal": null OR {',
  '    "mode": "new" | "existing",',
  '    "title": "goal title (required for new; for existing use the matched goal title)",',
  '    "existing_goal_title": null | "exact title of an existing goal when mode=existing",',
  '    "horizon_months": 1 | 3 | 6 | 12,',
  '    "tasks": [',
  '      {',
  '        "title": "task title",',
  '        "cadence": "daily" | "weekly" | "monthly",',
  '        "time": "HH:mm" | null,',
  '        "weekday": 0-6 | null,',
  '        "day_of_month": 1-31 | null,',
  '        "include_weekends": boolean,',
  '        "duration_minutes": number | null',
  '      }',
  '    ]',
  '  },',
  '  "resources": [',
  '    { "kind": "book" | "site" | "youtube", "title": "...", "url": "https://...", "why": "why this helps" }',
  '  ]',
  '}',
  'Rules:',
  '- Prefer improving an existing goal (mode=existing) when goals are listed; otherwise mode=new.',
  '- Include 2–4 tasks mixing daily/weekly/monthly when useful.',
  '- Include 1–3 real, helpful resources (prefer public URLs). youtube = video URL; book may be a store/library URL; site = article or tool.',
  '- Do not invent illegal or paywalled scrape URLs; use well-known public pages when unsure.',
  '- Keep titles short. Match locale of the user message (en or pt).',
  '- If you cannot suggest anything useful, return {"rationale":"...","goal":null,"resources":[]}.',
].join('\n');

function asTrimmed(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function isAreaId(value: string): boolean {
  return (AREA_IDS as readonly string[]).includes(value);
}

function isResourceKind(value: string): value is ResourceKind {
  return (RESOURCE_KINDS as readonly string[]).includes(value);
}

function isCadence(value: string): value is Cadence {
  return (CADENCES as readonly string[]).includes(value);
}

function parseHorizon(raw: unknown): number {
  const value = Number(raw);
  if ((HORIZONS as readonly number[]).includes(value)) return value;
  return 3;
}

function parseTime(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d{2}:\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function parseDuration(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0 || value > 24 * 60) return null;
  return value;
}

function parseTask(raw: unknown): SuggestionTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const title = asTrimmed(row.title);
  const cadenceRaw = asTrimmed(row.cadence);
  if (!title || !isCadence(cadenceRaw)) return null;

  const weekdayRaw = row.weekday;
  const weekday =
    typeof weekdayRaw === 'number' &&
    Number.isInteger(weekdayRaw) &&
    weekdayRaw >= 0 &&
    weekdayRaw <= 6
      ? weekdayRaw
      : null;
  const dayRaw = row.day_of_month ?? row.dayOfMonth;
  const dayOfMonth =
    typeof dayRaw === 'number' && Number.isInteger(dayRaw) && dayRaw >= 1 && dayRaw <= 31
      ? dayRaw
      : null;

  if (cadenceRaw === 'weekly' && weekday === null) return null;
  if (cadenceRaw === 'monthly' && dayOfMonth === null) return null;

  return {
    title,
    cadence: cadenceRaw,
    time: parseTime(row.time),
    weekday,
    day_of_month: dayOfMonth,
    include_weekends: Boolean(row.include_weekends ?? row.includeWeekends ?? false),
    duration_minutes: parseDuration(row.duration_minutes ?? row.durationMinutes),
  };
}

function parseResource(raw: unknown): SuggestionResource | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const kindRaw = asTrimmed(row.kind);
  const title = asTrimmed(row.title);
  const url = asTrimmed(row.url);
  const why = asTrimmed(row.why);
  if (!isResourceKind(kindRaw) || !title || !url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return { kind: kindRaw, title, url, why };
}

function parseGoal(raw: unknown): SuggestionGoal | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const mode = asTrimmed(row.mode) === 'existing' ? 'existing' : 'new';
  const title = asTrimmed(row.title);
  const existingTitle = asTrimmed(row.existing_goal_title ?? row.existingGoalTitle) || null;
  if (!title && mode === 'new') return null;
  if (mode === 'existing' && !existingTitle && !title) return null;

  const tasksRaw = Array.isArray(row.tasks) ? row.tasks : [];
  const tasks = tasksRaw
    .map(parseTask)
    .filter((task): task is SuggestionTask => task != null)
    .slice(0, 5);
  if (tasks.length === 0) return null;

  return {
    mode,
    title: title || existingTitle || 'Goal',
    existing_goal_title: mode === 'existing' ? (existingTitle ?? title) : null,
    horizon_months: parseHorizon(row.horizon_months ?? row.horizonMonths),
    tasks,
  };
}

function normalizeLifeAreaSuggestionRequest(body: unknown): SuggestionRequestContext {
  if (!body || typeof body !== 'object') {
    throw new LifeAreaSuggestionValidationError('Invalid body.');
  }
  const record = body as Record<string, unknown>;
  const userId = asTrimmed(record.user_id ?? record.userId);
  const areaId = asTrimmed(record.area_id ?? record.areaId);
  const areaLabel = asTrimmed(record.area_label ?? record.areaLabel);
  if (!userId) throw new LifeAreaSuggestionValidationError('Missing user_id.');
  if (!isAreaId(areaId)) throw new LifeAreaSuggestionValidationError('Invalid area_id.');
  if (!areaLabel) throw new LifeAreaSuggestionValidationError('Missing area_label.');

  const goalsRaw = Array.isArray(record.existing_goals ?? record.existingGoals)
    ? ((record.existing_goals ?? record.existingGoals) as unknown[])
    : [];
  const existingGoals = goalsRaw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const title = asTrimmed(row.title);
      if (!title) return null;
      const tasks = Array.isArray(row.tasks)
        ? row.tasks
            .map((task) => asTrimmed(task))
            .filter(Boolean)
            .slice(0, 8)
        : [];
      return { title, tasks };
    })
    .filter((item): item is { title: string; tasks: string[] } => item != null)
    .slice(0, 12);

  const linksRaw = Array.isArray(record.existing_links ?? record.existingLinks)
    ? ((record.existing_links ?? record.existingLinks) as unknown[])
    : [];
  const existingLinks = linksRaw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const label = asTrimmed(row.label);
      const url = asTrimmed(row.url);
      if (!label || !url) return null;
      return { label, url };
    })
    .filter((item): item is { label: string; url: string } => item != null)
    .slice(0, 20);

  return {
    user_id: userId,
    area_id: areaId,
    area_label: areaLabel,
    locale: asTrimmed(record.locale, 'en-US') || 'en-US',
    summary: asTrimmed(record.summary).slice(0, 600),
    motto: asTrimmed(record.motto).slice(0, 280),
    existing_goals: existingGoals,
    existing_links: existingLinks,
    profile_focus: asTrimmed(record.profile_focus ?? record.profileFocus).slice(0, 400),
  };
}

function normalizeLifeAreaSuggestionResponse(raw: unknown): LifeAreaSuggestionResult {
  if (!raw || typeof raw !== 'object') {
    return { rationale: '', goal: null, resources: [] };
  }
  const record = raw as Record<string, unknown>;
  const rationale = asTrimmed(record.rationale).slice(0, 400);
  const goal = parseGoal(record.goal);
  const resourcesRaw = Array.isArray(record.resources) ? record.resources : [];
  const resources = resourcesRaw
    .map(parseResource)
    .filter((item): item is SuggestionResource => item != null)
    .slice(0, 3);

  return { rationale, goal, resources };
}

function buildLifeAreaSuggestionUserMessage(ctx: SuggestionRequestContext): string {
  const goalsBlock =
    ctx.existing_goals.length === 0
      ? '(none yet)'
      : ctx.existing_goals
          .map((goal) => {
            const tasks = goal.tasks.length > 0 ? ` — tasks: ${goal.tasks.join('; ')}` : '';
            return `- ${goal.title}${tasks}`;
          })
          .join('\n');
  const linksBlock =
    ctx.existing_links.length === 0
      ? '(none yet)'
      : ctx.existing_links.map((link) => `- ${link.label}: ${link.url}`).join('\n');

  return [
    `Locale: ${ctx.locale}`,
    `Life area: ${ctx.area_label} (${ctx.area_id})`,
    `Summary: ${ctx.summary || '(empty)'}`,
    `Motto: ${ctx.motto || '(empty)'}`,
    `Profile focus: ${ctx.profile_focus || '(empty)'}`,
    'Existing goals:',
    goalsBlock,
    'Existing links:',
    linksBlock,
    'Suggest the next useful goal/tasks and resources as JSON now.',
  ].join('\n');
}

export = {
  LIFE_AREA_SUGGESTION_SYSTEM_PROMPT,
  LifeAreaSuggestionValidationError,
  normalizeLifeAreaSuggestionRequest,
  normalizeLifeAreaSuggestionResponse,
  buildLifeAreaSuggestionUserMessage,
};

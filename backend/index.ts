const { randomUUID, timingSafeEqual } = require('node:crypto') as typeof import('node:crypto');
const { createServer } = require('node:http') as typeof import('node:http');
const express = require('express') as typeof import('express');
const cors = require('cors') as typeof import('cors');
const { PrismaClient } = require('./generated/prisma') as typeof import('./generated/prisma');
const Anthropic = require('@anthropic-ai/sdk')
  .default as typeof import('@anthropic-ai/sdk').default;
const { WebSocket, WebSocketServer } = require('ws') as typeof import('ws');
const { AccessToken } = require('livekit-server-sdk') as typeof import('livekit-server-sdk');
const dotenv = require('dotenv') as typeof import('dotenv');

dotenv.config();

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT ?? 8080);
const RECENT_MESSAGE_LIMIT = Number(process.env.RECENT_MESSAGE_LIMIT ?? 20);
const VOICE_RECENT_MESSAGE_LIMIT = Number(process.env.VOICE_RECENT_MESSAGE_LIMIT ?? 8);
const RESPONSE_MAX_TOKENS = Number(process.env.RESPONSE_MAX_TOKENS ?? 700);
const VOICE_MAX_TOKENS = Number(process.env.VOICE_MAX_TOKENS ?? 280);
const VOICE_SAMPLE_RATE = Number(process.env.VOICE_SAMPLE_RATE ?? 16000);
const VOICE_PATH = '/voice/realtime';
const LIVEKIT_URL = process.env.LIVEKIT_URL ?? '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5';
const VOICE_MODEL = process.env.VOICE_MODEL ?? ANTHROPIC_MODEL;
const PROFILE_EXTRACTION_MODEL = process.env.PROFILE_EXTRACTION_MODEL ?? 'claude-haiku-4-5';
const PROFILE_EXTRACTION_MAX_TOKENS = Number(process.env.PROFILE_EXTRACTION_MAX_TOKENS ?? 400);
const PROFILE_EXTRACTION_MESSAGE_LIMIT = Number(process.env.PROFILE_EXTRACTION_MESSAGE_LIMIT ?? 10);
const SUMMARY_REBUILD_DELTA = Number(process.env.SUMMARY_REBUILD_DELTA ?? 10);
const SUMMARY_MESSAGE_LIMIT = Number(process.env.SUMMARY_MESSAGE_LIMIT ?? 30);
const SUMMARY_MAX_TOKENS = Number(process.env.SUMMARY_MAX_TOKENS ?? 300);
const SUMMARY_MODEL = process.env.SUMMARY_MODEL ?? 'claude-haiku-4-5';
const PROFILE_UPDATE_ON_VOICE =
  String(process.env.PROFILE_UPDATE_ON_VOICE ?? 'false').toLowerCase() === 'true';
const VOICE_TTS_MODE = (process.env.VOICE_TTS_MODE ?? 'streaming').toLowerCase();
const TURN_TIMEOUT_MS = Number(process.env.TURN_TIMEOUT_MS ?? 25000);
const STRONG_END_RE = /[.!?]+["')\]]?(?=\s|$)/g;
const SOFT_END_RE = /[,;:](?=\s)/g;
const MIN_SENTENCE_CHARS = Number(process.env.MIN_SENTENCE_CHARS ?? 12);
const SOFT_FLUSH_CHARS = Number(process.env.SOFT_FLUSH_CHARS ?? 40);
const HARD_FLUSH_CHARS = Number(process.env.HARD_FLUSH_CHARS ?? 80);
const ASSISTANT_SYSTEM_PROMPT =
  process.env.ASSISTANT_SYSTEM_PROMPT ??
  [
    "You are Dynamis, the user's Lead Guide in the Unlock experience.",
    'Right now your primary job is Discovery: help the user build a strong Intent Profile',
    'through conversation — not a scripted survey.',
    '',
    "=== PHASE FRAMING (say this early, in the user's language) ===",
    'We are in a formative phase. You are NOT delivering a finished plan or map yet.',
    'You are building their Intent Profile together — the foundation for their personal',
    'Watchtowers: individualized observation points that monitor topics and segments',
    'relevant to their path (work, study, transitions, opportunities).',
    'This may take more than one conversation; they can pause and return later.',
    '=== END PHASE FRAMING ===',
    '',
    'Discovery priorities — gather evidence naturally, one question at a time:',
    '1. Current context: what they do today (work, study, transition, or mix).',
    '2. Active focus: what they are studying, preparing for, or building right now.',
    '3. Aspirations: where they want to be in the next several months.',
    '4. Strengths: what they are good at or what others ask them for.',
    '5. Constraints: time limits, fears, skill gaps, or blockers.',
    '6. Values (optional): what matters to them in how they work and live.',
    '',
    'Use the USER PROFILE and USER BACKGROUND SUMMARY blocks when present.',
    'Reuse facts they shared; do not ask again for information already captured.',
    'Listen and validate before pushing to the next question.',
    '',
    'Pause and continuity:',
    '- After several back-and-forth turns, or if the user sounds tired or rushed, offer:',
    '  pause now and continue later, OR keep going — their choice.',
    '- If they return after a gap, briefly acknowledge what you already know and continue',
    '  from the next missing piece — do not restart Discovery from zero.',
    '',
    'When the profile feels sufficiently rich (most of items 1–5 have clear evidence):',
    '- Summarize their Intent Profile in 3–4 short sentences.',
    '- Recommend ONE personal Watchtower they could set up, tied to their profile.',
    '  Explain what it would observe and why it matters for them.',
    '- If they are still exploring direction, suggest a "new segment exploration" Watchtower',
    '  (discover adjacent opportunities). If their focus is clear, suggest a segment tracker',
    '  on that topic.',
    '- Invite them to refine the Watchtower focus or continue enriching the profile.',
    '  Do not claim a Watchtower is already activated in the product unless they confirm setup.',
    '',
    'Secondary goals (only when natural, never instead of Discovery):',
    '- Note how AI can amplify their work when relevant to what they shared.',
    '- If they are stuck, one small next step — not a full plan every turn.',
    '',
    'Style for live voice/chat:',
    '- Match the length and energy of the user. Brief input → brief reply.',
    '- Default to short, natural answers. Expand only when the user asks for depth.',
    '- Use the same language as the user.',
    '- One question at a time when gathering profile information.',
    '- Be human, warm, direct, and supportive — like a calm guide, not a motivational speaker.',
    '- Do not use bullet lists or markdown in voice replies.',
  ].join('\n');

const VOICE_MODE_PROMPT = [
  '',
  '=== VOICE MODE ===',
  'You are in a live voice conversation. Speak like a calm, natural human — not a coach monologue.',
  'Discovery and Watchtower framing still apply, but stay brief.',
  '',
  'Length (default):',
  '- Greetings, thanks, confirmations, small talk: 1 short sentence.',
  '- Profile questions: 1–2 sentences (brief validation + one question).',
  '- Only when summarizing the profile or recommending a Watchtower: up to 3–4 sentences.',
  '- Never stack multiple tips, steps, or closing encouragements in one turn.',
  '',
  'Tone:',
  '- If the user spoke briefly, reply briefly. Do not over-explain.',
  '- Validate feelings in one phrase, not a paragraph.',
  '- Do not end every turn with "I\'m here if you need" or similar — only when it truly fits.',
  '',
  'Format:',
  '- No lists, bullet points, or markdown.',
  '- Sound natural when spoken aloud. Avoid abbreviations and symbols.',
  '- One question at a time when gathering Intent Profile information.',
  '=== END VOICE MODE ===',
].join('\n');

const prisma = new PrismaClient();

async function connectPrisma(): Promise<void> {
  await prisma.$connect();
  console.log('[prisma] connected');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type UserProfile = {
  user_id: string;
  display_name: string | null;
  role_context: string | null;
  aspirations: string | null;
  strengths: string | null;
  weaknesses: string | null;
  values_list: string[];
  active_focus: string | null;
  notes: string | null;
  long_term_summary: string | null;
  long_term_summary_at: Date | null;
  long_term_summary_msg_count: number;
};
type ProfileExtractionPayload = {
  display_name?: string | null;
  role_context?: string | null;
  aspirations?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  values_list?: string[] | null;
  active_focus?: string | null;
  notes?: string | null;
};
type WatchtowerCoverageType = 'personal' | 'professional';
type WatchtowerIntentSpec = {
  topic: string;
  intent_summary: string;
  signals_of_interest: string[];
  suggested_sources: string[];
  suggested_frequency: string;
  evidence_basis: string;
  rationale: string;
};
type WatchtowerRecommendation = {
  recommendation_id: string;
  user_id: string;
  coverage_type: WatchtowerCoverageType;
  display_name: string;
  user_facing_description: string;
  watchtower_intent_spec: WatchtowerIntentSpec;
  status: 'proposed';
  generated_at: string;
};
type VoiceSessionMode = 'full' | 'stt_only';

type VoiceSessionContext = {
  userId: string;
  sessionId: string;
  sampleRate: number;
  endpointingMs?: number;
  mode: VoiceSessionMode;
};
type AssemblyTurnMessage = {
  type: 'Turn';
  transcript: string;
  end_of_turn: boolean;
  turn_order?: number;
};

function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function getHeaderValue(value: string | string[] | undefined): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return '';
}

function safeCompareKeys(clientKey: string, serverKey: string): boolean {
  const a = Buffer.from(clientKey, 'utf8');
  const b = Buffer.from(serverKey, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function isRequestAuthorized(
  req: import('express').Request | import('node:http').IncomingMessage,
): boolean {
  // Dev bypass: when DEV_AUTH_BYPASS=true is set, skip auth entirely.
  // This is HARD-DISABLED when NODE_ENV=production for safety.
  if (
    process.env.NODE_ENV !== 'production' &&
    (process.env.DEV_AUTH_BYPASS ?? '').toLowerCase() === 'true'
  ) {
    return true;
  }

  const clientApiKey = getHeaderValue(req.headers['x-api-key']);
  const serverApiKey = process.env.APP_SECRET_KEY ?? '';
  return Boolean(serverApiKey && clientApiKey && safeCompareKeys(clientApiKey, serverApiKey));
}

async function loadRecentHistory(
  userId: string,
  sessionId: string,
  limit: number,
): Promise<ChatMessage[]> {
  const rows = await prisma.chatHistory.findMany({
    where: { user_id: userId, session_id: sessionId },
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    take: limit,
  });

  const out: ChatMessage[] = [];
  for (const row of rows) {
    const sender = String(row.sender ?? '');
    const message = String(row.message ?? '');
    if (sender === 'user') {
      out.push({ role: 'user', content: message });
    } else if (sender === 'agent') {
      out.push({ role: 'assistant', content: message });
    }
  }
  return out;
}

/**
 * Checks whether this user has ever received an agent reply before.
 * Used to trigger a one-time self-introduction in the very first reply.
 */
async function isFirstEverInteraction(userId: string): Promise<boolean> {
  const existing = await prisma.chatHistory.findFirst({
    where: { user_id: userId, sender: 'agent' },
    select: { id: true },
  });
  return existing === null;
}

function shouldOpenWithIntroduction(
  firstEver: boolean,
  prior: ChatMessage[],
  extra: { alreadyIntroducedInSession?: boolean; interruptedReply?: string } = {},
): boolean {
  if (!firstEver) return false;
  if (prior.some((m) => m.role === 'assistant')) return false;
  if (extra.alreadyIntroducedInSession) return false;
  if (extra.interruptedReply?.trim()) return false;
  return true;
}

function buildIntroductionSystemBlock(shouldIntroduce: boolean): string {
  if (shouldIntroduce) {
    return [
      '=== FIRST INTERACTION RULE ===',
      'This is your VERY FIRST reply to this user (no previous history exists).',
      "Open as a personal copilot focused on the user's goals, what matters to them,",
      'and helping them grow — keep it human and about the user.',
      'Do NOT mention Watchtowers, Intent Profiles, Discovery, or any internal/product concept.',
      "Use this style (adapt slightly to the user's language; keep the same length, tone, and intent):",
      "\"Hi, I'm Dynamis, your personal copilot. I'm here to understand your goals and what",
      'matters to you, and help you grow toward them. To start — what are you working on',
      'or thinking about right now?"',
      'Keep it short: two short sentences plus that open question to get them talking.',
      'Do NOT introduce yourself again in future replies. Use the same language as the user.',
      '=== END FIRST INTERACTION RULE ===',
    ].join('\n');
  }
  return [
    '=== ONGOING CONVERSATION RULE ===',
    'You have already introduced yourself. NEVER open with your name, role, or any',
    'self-introduction (e.g. "I\'m Dynamis", "your Lead Guide", or "your career copilot").',
    'Respond directly to what the user just said.',
    '=== END ONGOING CONVERSATION RULE ===',
  ].join('\n');
}

async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  const row = await prisma.userProfile.findUnique({
    where: { user_id: userId },
  });
  if (!row) {
    return null;
  }
  let values: string[] = [];
  if (Array.isArray(row.values_list)) {
    values = (row.values_list as unknown[]).filter((v): v is string => typeof v === 'string');
  }
  return {
    user_id: String(row.user_id),
    display_name: (row.display_name as string | null) ?? null,
    role_context: (row.role_context as string | null) ?? null,
    aspirations: (row.aspirations as string | null) ?? null,
    strengths: (row.strengths as string | null) ?? null,
    weaknesses: (row.weaknesses as string | null) ?? null,
    values_list: values,
    active_focus: (row.active_focus as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    long_term_summary: (row.long_term_summary as string | null) ?? null,
    long_term_summary_at: (row.long_term_summary_at as Date | null) ?? null,
    long_term_summary_msg_count: Number(row.long_term_summary_msg_count ?? 0),
  };
}

function formatProfileForPrompt(profile: UserProfile | null): string | null {
  if (!profile) {
    return null;
  }
  const lines: string[] = [];
  if (profile.display_name) lines.push(`- Name: ${profile.display_name}`);
  if (profile.role_context) lines.push(`- Current role / context: ${profile.role_context}`);
  if (profile.aspirations) lines.push(`- Aspirations: ${profile.aspirations}`);
  if (profile.strengths) lines.push(`- Strengths: ${profile.strengths}`);
  if (profile.weaknesses) lines.push(`- Weaknesses / blockers: ${profile.weaknesses}`);
  if (profile.values_list.length > 0) {
    lines.push(`- Core values: ${profile.values_list.join(', ')}`);
  }
  if (profile.active_focus) lines.push(`- Active focus right now: ${profile.active_focus}`);
  if (profile.notes) lines.push(`- Other relevant notes: ${profile.notes}`);
  if (lines.length === 0) {
    return null;
  }
  return lines.join('\n');
}

type ProfileDimensionId = 'values' | 'mission' | 'strengths' | 'constraints';
type ProfileSignalsPayload = Record<ProfileDimensionId, number>;

const PROFILE_DIMENSION_KEYWORDS: Record<ProfileDimensionId, string[]> = {
  values: [
    'value',
    'values',
    'family',
    'integrity',
    'balance',
    'freedom',
    'trust',
    'care',
    'health',
    'relationship',
  ],
  mission: [
    'goal',
    'mission',
    'purpose',
    'career',
    'build',
    'startup',
    'climate',
    'project',
    'aspiration',
    'focus',
    'objective',
  ],
  strengths: ['strength', 'skill', 'talent', 'excel', 'capable', 'good at', 'expert', 'experience'],
  constraints: [
    'worry',
    'struggle',
    'hard',
    'fear',
    'block',
    'stress',
    'weakness',
    'constraint',
    'limit',
    'anxiety',
  ],
};

const INSIGHT_STOP_WORDS = new Set([
  'that',
  'this',
  'with',
  'have',
  'from',
  'your',
  'about',
  'what',
  'when',
  'would',
  'could',
  'should',
  'there',
  'their',
  'them',
  'been',
  'being',
  'just',
  'like',
  'really',
  'think',
  'know',
  'want',
  'need',
  'more',
  'some',
  'into',
  'also',
  'very',
  'much',
  'today',
  'tomorrow',
  'yesterday',
]);

function clampProfilePercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function textRichnessScore(text: string | null | undefined, targetChars = 120): number {
  if (!text || !text.trim()) {
    return 0;
  }
  const length = text.trim().length;
  return clampProfilePercent(15 + (length / targetChars) * 85);
}

function computeProfileSignalsFromProfile(profile: UserProfile | null): ProfileSignalsPayload {
  if (!profile) {
    return { values: 8, mission: 8, strengths: 8, constraints: 8 };
  }

  const valuesList = profile.values_list ?? [];
  let values = 0;
  if (valuesList.length > 0) {
    const combinedLength = valuesList.join(' ').length;
    values = clampProfilePercent(valuesList.length * 12 + combinedLength / 2.5);
  }

  const mission = clampProfilePercent(
    Math.max(
      textRichnessScore(profile.aspirations, 200),
      textRichnessScore(profile.role_context, 160) * 0.9,
      textRichnessScore(profile.active_focus, 120) * 0.8,
      textRichnessScore(profile.long_term_summary, 240) * 0.45,
    ),
  );

  const strengths = textRichnessScore(profile.strengths, 150);
  const constraints = textRichnessScore(profile.weaknesses, 150);

  return { values, mission, strengths, constraints };
}

function conversationBoostFromMessages(messages: string[]): ProfileSignalsPayload {
  const boosts: ProfileSignalsPayload = {
    values: 0,
    mission: 0,
    strengths: 0,
    constraints: 0,
  };

  for (const message of messages) {
    const lower = message.toLowerCase();
    for (const dimension of Object.keys(PROFILE_DIMENSION_KEYWORDS) as ProfileDimensionId[]) {
      for (const keyword of PROFILE_DIMENSION_KEYWORDS[dimension]) {
        if (lower.includes(keyword)) {
          boosts[dimension] += 4;
        }
      }
    }
  }

  return boosts;
}

function mergeProfileSignals(
  base: ProfileSignalsPayload,
  boost: ProfileSignalsPayload,
): ProfileSignalsPayload {
  return {
    values: clampProfilePercent(base.values + boost.values),
    mission: clampProfilePercent(base.mission + boost.mission),
    strengths: clampProfilePercent(base.strengths + boost.strengths),
    constraints: clampProfilePercent(base.constraints + boost.constraints),
  };
}

async function loadRecentUserMessages(userId: string, limit = 24): Promise<string[]> {
  const rows = await prisma.chatHistory.findMany({
    where: { user_id: userId, sender: 'user' },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit,
  });
  rows.reverse();
  return rows
    .map((row) =>
      String(row.message ?? '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((message) => message.length > 0);
}

function topRepeatedWords(messages: string[], minCount = 2): Array<[string, number]> {
  const frequency = new Map<string, number>();

  for (const message of messages) {
    const matches = message.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
    for (const word of matches) {
      if (INSIGHT_STOP_WORDS.has(word)) {
        continue;
      }
      frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }
  }

  return [...frequency.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function computeEmergingInsight(profile: UserProfile | null, userMessages: string[]): string {
  const repeated = topRepeatedWords(userMessages, 2);

  if (repeated.length >= 2) {
    const [firstWord, firstCount] = repeated[0]!;
    const [secondWord, secondCount] = repeated[1]!;
    return (
      `Pattern emerging: you return to "${firstWord}" ${String(firstCount)} times and ` +
      `"${secondWord}" ${String(secondCount)} times — there may be a thread between ` +
      'what you keep circling and what you want next.'
    );
  }

  if (repeated.length === 1) {
    const [word, count] = repeated[0]!;
    return (
      `Pattern emerging: "${word}" shows up ${String(count)} times in what you share — ` +
      'worth naming explicitly in your next reply.'
    );
  }

  const focus = profile?.active_focus?.trim();
  if (focus) {
    const snippet = focus.length > 90 ? `${focus.slice(0, 89)}…` : focus;
    return `Early signal: your active focus — "${snippet}" — is anchoring how we read your Intent Profile.`;
  }

  const aspirations = profile?.aspirations?.trim();
  if (aspirations) {
    const snippet = aspirations.length > 90 ? `${aspirations.slice(0, 89)}…` : aspirations;
    return `Early signal: your aspiration — "${snippet}" — is becoming the spine of your Intent Profile.`;
  }

  if (userMessages.length > 0) {
    return 'Keep sharing — each reply sharpens the four dimensions of your Intent Profile.';
  }

  return 'Start the conversation — your Intent Profile signals update as you speak.';
}

async function buildDiscoverySignalsPayload(userId: string): Promise<{
  profile_signals: ProfileSignalsPayload;
  insight: string;
}> {
  const [profile, userMessages] = await Promise.all([
    loadUserProfile(userId),
    loadRecentUserMessages(userId),
  ]);

  const base = computeProfileSignalsFromProfile(profile);
  const boost = conversationBoostFromMessages(userMessages);
  const profile_signals = mergeProfileSignals(base, boost);
  const insight = computeEmergingInsight(profile, userMessages);

  return { profile_signals, insight };
}

const POSSIBILITY_MAP_DIMENSION_IDS = [
  'aiDisruption',
  'careerReinvention',
  'healthLongevity',
  'purposeMeaning',
] as const;

type PossibilityMapDimensionId = (typeof POSSIBILITY_MAP_DIMENSION_IDS)[number];

const POSSIBILITY_MAP_FIXED_META: Record<
  PossibilityMapDimensionId,
  { name: string; icon: string }
> = {
  aiDisruption: {
    name: 'Navigating AI Disruption',
    icon: 'brain',
  },
  careerReinvention: {
    name: 'Career Reinvention',
    icon: 'briefcase',
  },
  healthLongevity: {
    name: 'Health & Longevity',
    icon: 'heart',
  },
  purposeMeaning: {
    name: 'Purpose & Meaning',
    icon: 'compass',
  },
};

const POSSIBILITY_MAP_FALLBACK_LEVERAGE: Record<PossibilityMapDimensionId, number> = {
  aiDisruption: 340,
  careerReinvention: 220,
  healthLongevity: 180,
  purposeMeaning: 260,
};

const LEVERAGE_PERCENT_MIN = 50;
const LEVERAGE_PERCENT_MAX = 999;

const POSSIBILITY_MAP_FALLBACK_DESCRIPTIONS: Record<PossibilityMapDimensionId, string> = {
  aiDisruption: 'AI is reshaping what one person can accomplish. The leverage is yours to claim.',
  careerReinvention: 'The path you want is closer than it looks. The capability gap is collapsing.',
  healthLongevity:
    'Decade-long energy curve, not annual. Sleep, recovery, and cognition treated as compounding assets.',
  purposeMeaning: 'The work that closes the gap between who you are and who you are becoming.',
};

const POSSIBILITY_MAP_SYSTEM_PROMPT = [
  "You generate a 'Possibility Map' for a career-transformation product called Dynamis.",
  "Given a user's intent profile, write 4 short, punchy, inspiring descriptions — one per fixed dimension.",
  'The 4 dimensions are FIXED (do not invent new ones):',
  '1. aiDisruption (how AI multiplies their leverage in their field)',
  '2. careerReinvention (their aspiration is closer than it looks)',
  '3. healthLongevity (sustaining energy/values over the long arc)',
  '4. purposeMeaning (closing the gap toward what matters to them)',
  "Each description: 1-2 sentences, max ~30 words, second person ('you/your'), grounded in the SPECIFIC profile details. Inspiring but not cheesy.",
  "For each dimension, also produce a 'leveragePercent': an integer between 120 and 400 representing the directional magnitude of opportunity for THIS person in THIS dimension.",
  "Vary the numbers meaningfully across the 4 dimensions based on where this person's profile suggests the biggest leverage. Don't make them all similar.",
  'Higher = more transformative potential given their specific situation.',
  'Output ONLY valid JSON, no markdown, no preamble, in this exact shape:',
  '{"dimensions":[{"id":"aiDisruption","description":"...","leveragePercent":340},{"id":"careerReinvention","description":"...","leveragePercent":220},{"id":"healthLongevity","description":"...","leveragePercent":180},{"id":"purposeMeaning","description":"...","leveragePercent":260}]}',
].join('\n');

function formatProfileForPossibilityMapPrompt(profile: UserProfile): string {
  const lines: string[] = [];
  if (profile.role_context) {
    lines.push(`role_context: ${profile.role_context}`);
  }
  if (profile.aspirations) {
    lines.push(`aspirations: ${profile.aspirations}`);
  }
  if (profile.strengths) {
    lines.push(`strengths: ${profile.strengths}`);
  }
  if (profile.weaknesses) {
    lines.push(`weaknesses: ${profile.weaknesses}`);
  }
  if (profile.values_list.length > 0) {
    lines.push(`values_list: ${profile.values_list.join(', ')}`);
  }
  if (profile.active_focus) {
    lines.push(`active_focus: ${profile.active_focus}`);
  }
  if (profile.long_term_summary) {
    lines.push(`long_term_summary: ${profile.long_term_summary}`);
  }
  if (lines.length === 0) {
    return 'No profile fields captured yet. Write universal but warm second-person copy for each dimension.';
  }
  return lines.join('\n');
}

function extractJsonObjectFromText(text: string): unknown | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // continue
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  return null;
}

function isPossibilityMapDimensionId(value: string): value is PossibilityMapDimensionId {
  return (POSSIBILITY_MAP_DIMENSION_IDS as readonly string[]).includes(value);
}

function parseLeveragePercent(raw: unknown, fallback: number): number {
  let numeric: number;
  if (typeof raw === 'number') {
    numeric = raw;
  } else if (typeof raw === 'string') {
    numeric = Number(raw.trim());
  } else {
    return fallback;
  }

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const rounded = Math.round(numeric);
  if (rounded < LEVERAGE_PERCENT_MIN || rounded > LEVERAGE_PERCENT_MAX) {
    return fallback;
  }

  return Math.min(LEVERAGE_PERCENT_MAX, Math.max(LEVERAGE_PERCENT_MIN, rounded));
}

function buildPossibilityMapDimensions(parsed: unknown): Array<{
  id: PossibilityMapDimensionId;
  name: string;
  leveragePercent: number;
  description: string;
  icon: string;
}> {
  const descriptionById = new Map<PossibilityMapDimensionId, string>();
  const leverageById = new Map<PossibilityMapDimensionId, number>();

  if (parsed && typeof parsed === 'object' && 'dimensions' in parsed) {
    const rawDimensions = (parsed as { dimensions?: unknown }).dimensions;
    if (Array.isArray(rawDimensions)) {
      for (const item of rawDimensions) {
        if (!item || typeof item !== 'object') {
          continue;
        }
        const id = String((item as { id?: unknown }).id ?? '').trim();
        const description = String((item as { description?: unknown }).description ?? '').trim();
        if (!isPossibilityMapDimensionId(id)) {
          continue;
        }
        if (description) {
          descriptionById.set(id, description);
        }
        const fallbackLeverage = POSSIBILITY_MAP_FALLBACK_LEVERAGE[id];
        const leverage = parseLeveragePercent(
          (item as { leveragePercent?: unknown }).leveragePercent,
          fallbackLeverage,
        );
        leverageById.set(id, leverage);
      }
    }
  }

  return POSSIBILITY_MAP_DIMENSION_IDS.map((id) => {
    const meta = POSSIBILITY_MAP_FIXED_META[id];
    const fallbackLeverage = POSSIBILITY_MAP_FALLBACK_LEVERAGE[id];
    return {
      id,
      name: meta.name,
      leveragePercent: leverageById.get(id) ?? fallbackLeverage,
      icon: meta.icon,
      description: descriptionById.get(id) ?? POSSIBILITY_MAP_FALLBACK_DESCRIPTIONS[id],
    };
  });
}

const TRANSFORMATION_PLAN_GOAL_COUNT = 5;

const TRANSFORMATION_PLAN_ALLOWED_TAGS = new Set(['research', 'build', 'reflect']);
const TRANSFORMATION_PLAN_ALLOWED_PRIORITIES = new Set(['high', 'normal']);
const TRANSFORMATION_PLAN_ALLOWED_DUE_KEYS = new Set(['todayAt', 'tomorrow', 'wed', 'fri']);

const TRANSFORMATION_PLAN_SYSTEM_PROMPT = [
  "You generate a 'Transformation Plan' for a career-transformation product called Dynamis.",
  "Given a user's intent profile, write 5 concrete, actionable tasks that move this specific person toward their stated aspirations.",
  "Each task should be: specific (not vague), doable in a week or less, second person ('You will...' implied), grounded in THEIR profile details. 8-14 words ideally. Examples of tone (DON'T copy literally, just tone):",
  "'Interview 5 senior front-end devs about AI tooling adoption',",
  "'Ship a 200-word post on what you learned this week',",
  "'Build a tiny CLI that automates one repetitive task in your job'.",
  "Spread tasks across difficulty: 1-2 quick research/reflect tasks, 2-3 build tasks. Mix priorities so 1-2 are 'high' priority.",
  "Schedule across the week: 1 'todayAt', 1 'tomorrow', 1 'wed', 1 'fri', 1 with no schedule (general).",
  'Output ONLY valid JSON, no markdown, no preamble, exact shape:',
  '{"goals":[',
  '{"id":"goal_1","title":"...","priority":"normal","tag":"research","dueLabelKey":"todayAt"},',
  '{"id":"goal_2","title":"...","priority":"high","tag":"build","dueLabelKey":"tomorrow"},',
  '... (5 total)',
  ']}',
  "Allowed tag values: 'research', 'build', 'reflect'.",
  "Allowed priority values: 'high', 'normal'.",
  "Allowed dueLabelKey values: 'todayAt', 'tomorrow', 'wed', 'fri', or OMIT the field for general/no-schedule task.",
  "ids must be unique strings like 'goal_1' through 'goal_5'.",
].join('\n');

const TRANSFORMATION_PLAN_FALLBACK_GOALS = [
  {
    id: 'goal_1',
    title: "Reflect on this week's biggest insight",
    priority: 'normal',
    tag: 'reflect',
    dueLabelKey: 'todayAt',
    realized: false,
    realizedAt: null,
  },
  {
    id: 'goal_2',
    title: 'Identify one skill gap to close this month',
    priority: 'high',
    tag: 'research',
    dueLabelKey: 'tomorrow',
    realized: false,
    realizedAt: null,
  },
  {
    id: 'goal_3',
    title: 'Ship a small prototype that automates one repetitive task',
    priority: 'normal',
    tag: 'build',
    dueLabelKey: 'wed',
    realized: false,
    realizedAt: null,
  },
  {
    id: 'goal_4',
    title: 'Interview two people who have done what you aspire to do',
    priority: 'high',
    tag: 'research',
    dueLabelKey: 'fri',
    realized: false,
    realizedAt: null,
  },
  {
    id: 'goal_5',
    title: 'Write a one-paragraph statement of your next career move',
    priority: 'normal',
    tag: 'reflect',
    realized: false,
    realizedAt: null,
  },
];

function parseTransformationPlanTag(raw: unknown): string {
  const value = String(raw ?? '').trim();
  return TRANSFORMATION_PLAN_ALLOWED_TAGS.has(value) ? value : 'research';
}

function parseTransformationPlanPriority(raw: unknown): string {
  const value = String(raw ?? '').trim();
  return TRANSFORMATION_PLAN_ALLOWED_PRIORITIES.has(value) ? value : 'normal';
}

function parseTransformationPlanDueKey(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }
  const value = String(raw).trim();
  return TRANSFORMATION_PLAN_ALLOWED_DUE_KEYS.has(value) ? value : undefined;
}

function parseTransformationPlanGoalItem(
  item: unknown,
  seenIds: Set<string>,
): {
  id: string;
  title: string;
  priority: string;
  tag: string;
  dueLabelKey?: string;
  realized: boolean;
  realizedAt: null;
} | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const rawId = String((item as { id?: unknown }).id ?? '').trim();
  const title = String((item as { title?: unknown }).title ?? '').trim();
  if (!rawId || !title || seenIds.has(rawId)) {
    return null;
  }

  const goal = {
    id: rawId,
    title: title.slice(0, 240),
    priority: parseTransformationPlanPriority((item as { priority?: unknown }).priority),
    tag: parseTransformationPlanTag((item as { tag?: unknown }).tag),
    realized: false,
    realizedAt: null,
  };

  const dueLabelKey = parseTransformationPlanDueKey(
    (item as { dueLabelKey?: unknown }).dueLabelKey,
  );
  if (dueLabelKey) {
    return { ...goal, dueLabelKey };
  }
  return goal;
}

function buildTransformationPlanGoals(
  parsed: unknown | null,
): typeof TRANSFORMATION_PLAN_FALLBACK_GOALS {
  const validated: typeof TRANSFORMATION_PLAN_FALLBACK_GOALS = [];
  const seenIds = new Set<string>();

  if (parsed && typeof parsed === 'object' && 'goals' in parsed) {
    const rawGoals = (parsed as { goals?: unknown }).goals;
    if (Array.isArray(rawGoals)) {
      for (const item of rawGoals) {
        const goal = parseTransformationPlanGoalItem(item, seenIds);
        if (!goal) {
          continue;
        }
        seenIds.add(goal.id);
        validated.push(goal);
        if (validated.length >= TRANSFORMATION_PLAN_GOAL_COUNT) {
          break;
        }
      }
    }
  }

  if (validated.length >= TRANSFORMATION_PLAN_GOAL_COUNT) {
    return validated.slice(0, TRANSFORMATION_PLAN_GOAL_COUNT);
  }

  return TRANSFORMATION_PLAN_FALLBACK_GOALS.map((goal) => ({ ...goal }));
}

const WATCHTOWER_MAX_RECOMMENDATIONS = 5;
const WATCHTOWER_MAX_TOKENS = 1600;

const WATCHTOWER_RECOMMENDATIONS_SYSTEM_PROMPT = [
  'You generate Watchtower recommendations for Dynamis, a career-transformation product.',
  "A Watchtower is a recurring area the system will monitor on the user's behalf, surfacing relevant signals (e.g. a weekly digest).",
  "Given the user's intent profile, produce 2-5 personalized watchtower recommendations.",
  'Count is driven by profile richness: 2 for a thin profile, up to 5 for a rich one.',
  'Coverage rules:',
  '- Prefer minimum 2 recommendations with BOTH a personal-life and a professional-life watchtower when evidence exists.',
  '- ALWAYS try to include at least one PERSONAL and one PROFESSIONAL watchtower.',
  '- Anchor the personal watchtower in real profile evidence — especially values_list, weaknesses, active_focus, and notes (these often carry personal-life signals). Also use personal cues in aspirations / role_context when they clearly refer to life outside work.',
  '- NEVER invent facts, relationships, hobbies, health conditions, or life events the profile does not contain.',
  '- If there is genuinely no personal-life evidence, emit only professional recommendations (still 2-5 when possible) rather than fabricating a personal one.',
  'Each recommendation must be explicitly grounded in something specific from the profile.',
  'user_facing_description should reference that evidence naturally (e.g. "you mentioned you want to move into AI-driven design but feel behind on the vocabulary").',
  'Tone: warm, plain-language, concrete about what the user will receive.',
  'display_name must be personalized (e.g. "Your fundraising landscape"), never generic labels like "Career updates".',
  'suggested_sources may be an empty array. suggested_frequency examples: "weekly", "biweekly".',
  'evidence_basis must name which profile fields drove the recommendation.',
  'Output ONLY valid JSON, no markdown, no preamble, exact shape:',
  '{"recommendations":[',
  '{"coverage_type":"professional","display_name":"...","user_facing_description":"...","watchtower_intent_spec":{"topic":"...","intent_summary":"...","signals_of_interest":["..."],"suggested_sources":["..."],"suggested_frequency":"weekly","evidence_basis":"...","rationale":"..."}}',
  ']}',
  "coverage_type must be exactly 'personal' or 'professional'.",
  'Do not include recommendation_id, user_id, status, or generated_at — the server adds those.',
].join('\n');

function formatProfileForWatchtowerPrompt(profile: UserProfile): string {
  const base = formatProfileForPossibilityMapPrompt(profile);
  const notes = profile.notes?.trim();
  if (!notes) {
    return base;
  }
  if (base.startsWith('No profile fields')) {
    return `notes: ${notes}`;
  }
  return `${base}\nnotes: ${notes}`;
}

function isProfileSufficientForWatchtower(profile: UserProfile | null): boolean {
  if (!profile) {
    return false;
  }
  const hasRole = Boolean(profile.role_context?.trim());
  const hasAspirations = Boolean(profile.aspirations?.trim());
  return hasRole || hasAspirations;
}

function coerceWatchtowerStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

function parseWatchtowerCoverageType(raw: unknown): WatchtowerCoverageType | null {
  const value = String(raw ?? '').trim();
  if (value === 'personal' || value === 'professional') {
    return value;
  }
  return null;
}

function parseWatchtowerIntentSpec(raw: unknown): WatchtowerIntentSpec | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const topic = String(record.topic ?? '').trim();
  const intentSummary = String(record.intent_summary ?? '').trim();
  const evidenceBasis = String(record.evidence_basis ?? '').trim();
  const rationale = String(record.rationale ?? '').trim();
  const suggestedFrequency = String(record.suggested_frequency ?? '').trim();
  if (!topic || !intentSummary || !evidenceBasis || !rationale || !suggestedFrequency) {
    return null;
  }
  return {
    topic,
    intent_summary: intentSummary,
    signals_of_interest: coerceWatchtowerStringArray(record.signals_of_interest),
    suggested_sources: coerceWatchtowerStringArray(record.suggested_sources),
    suggested_frequency: suggestedFrequency,
    evidence_basis: evidenceBasis,
    rationale,
  };
}

function parseWatchtowerRecommendationItem(
  item: unknown,
  userId: string,
  generatedAt: string,
): WatchtowerRecommendation | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const record = item as Record<string, unknown>;
  const coverageType = parseWatchtowerCoverageType(record.coverage_type);
  const displayName = String(record.display_name ?? '').trim();
  const userFacingDescription = String(record.user_facing_description ?? '').trim();
  const intentSpec = parseWatchtowerIntentSpec(record.watchtower_intent_spec);
  if (!coverageType || !displayName || !userFacingDescription || !intentSpec) {
    return null;
  }
  return {
    recommendation_id: randomUUID(),
    user_id: userId,
    coverage_type: coverageType,
    display_name: displayName,
    user_facing_description: userFacingDescription,
    watchtower_intent_spec: intentSpec,
    status: 'proposed',
    generated_at: generatedAt,
  };
}

function buildWatchtowerRecommendations(
  parsed: unknown | null,
  userId: string,
): WatchtowerRecommendation[] {
  const generatedAt = new Date().toISOString();
  const recommendations: WatchtowerRecommendation[] = [];

  if (!parsed || typeof parsed !== 'object' || !('recommendations' in parsed)) {
    return recommendations;
  }

  const rawList = (parsed as { recommendations?: unknown }).recommendations;
  if (!Array.isArray(rawList)) {
    return recommendations;
  }

  for (const item of rawList) {
    const recommendation = parseWatchtowerRecommendationItem(item, userId, generatedAt);
    if (!recommendation) {
      console.warn('[watchtower] dropped invalid recommendation item', { user_id: userId });
      continue;
    }
    recommendations.push(recommendation);
    if (recommendations.length >= WATCHTOWER_MAX_RECOMMENDATIONS) {
      break;
    }
  }

  if (
    recommendations.length > 0 &&
    !recommendations.some((item) => item.coverage_type === 'personal')
  ) {
    console.warn('[watchtower] personal coverage absent', {
      user_id: userId,
      count: recommendations.length,
    });
  }

  return recommendations;
}

async function countCrossSessionMessages(
  userId: string,
  excludeSessionId: string,
): Promise<number> {
  return prisma.chatHistory.count({
    where: {
      user_id: userId,
      session_id: { not: excludeSessionId },
    },
  });
}

async function fetchCrossSessionMessages(
  userId: string,
  excludeSessionId: string,
  limit: number,
): Promise<{ sender: string; message: string }[]> {
  const rows = await prisma.chatHistory.findMany({
    where: {
      user_id: userId,
      session_id: { not: excludeSessionId },
    },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit,
  });
  rows.reverse();
  return rows.map((row) => ({
    sender: String(row.sender ?? ''),
    message: String(row.message ?? ''),
  }));
}

async function generateUserSummary(
  userId: string,
  rows: { sender: string; message: string }[],
): Promise<string | null> {
  if (rows.length === 0) {
    return null;
  }
  const transcript = rows
    .map((r) => {
      const role = r.sender === 'user' ? 'User' : 'Dynamis';
      const clean = r.message.replace(/\s+/g, ' ').trim();
      return `- ${role}: ${clean.slice(0, 600)}`;
    })
    .join('\n');

  const summarizerPrompt = [
    'You are summarizing prior conversations between a user and Dynamis (their AI career copilot).',
    'Produce a concise, factual third-person briefing about THIS USER for future sessions.',
    'Cover: who they are, their goals, current focus, recurring struggles, prior advice given.',
    'Be terse and bullet-driven. 5-10 short bullets max. No greetings, no intros, no commentary.',
    'Only include facts grounded in the transcript. If information is missing, omit it.',
    'Output plain text bullets only.',
  ].join('\n');

  const res = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    system: summarizerPrompt,
    max_tokens: SUMMARY_MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: `Transcript excerpts (chronological):\n${transcript}\n\nReturn the briefing now.`,
      },
    ],
  });
  const block = res.content[0];
  if (!block || block.type !== 'text') {
    return null;
  }
  const text = block.text.trim();
  console.log('[summary] generated', {
    user_id: userId,
    chars: text.length,
    input_messages: rows.length,
    input_tokens: res.usage?.input_tokens ?? null,
    output_tokens: res.usage?.output_tokens ?? null,
  });
  return text || null;
}

async function ensureUserSummaryFresh(
  userId: string,
  currentSessionId: string,
  cachedProfile: UserProfile | null,
  opts: { allowRebuild?: boolean } = {},
): Promise<string | null> {
  const allowRebuild = opts.allowRebuild !== false;
  const totalMessages = await countCrossSessionMessages(userId, currentSessionId);
  const cachedCount = cachedProfile?.long_term_summary_msg_count ?? 0;
  const cachedSummary = cachedProfile?.long_term_summary ?? null;

  if (totalMessages === 0) {
    console.log('[summary] state', {
      user_id: userId,
      fresh: true,
      total_cross_session: 0,
      cached_count: cachedCount,
      had_summary: Boolean(cachedSummary),
    });
    return null;
  }

  const delta = totalMessages - cachedCount;
  const needsRebuild = !cachedSummary || delta >= SUMMARY_REBUILD_DELTA;
  console.log('[summary] state', {
    user_id: userId,
    fresh: !needsRebuild,
    total_cross_session: totalMessages,
    cached_count: cachedCount,
    delta,
    had_summary: Boolean(cachedSummary),
  });
  if (!needsRebuild) {
    return cachedSummary;
  }
  if (!allowRebuild) {
    return cachedSummary;
  }

  try {
    const rows = await fetchCrossSessionMessages(userId, currentSessionId, SUMMARY_MESSAGE_LIMIT);
    const summary = await generateUserSummary(userId, rows);
    const now = new Date();
    await prisma.userProfile.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        long_term_summary: summary,
        long_term_summary_at: now,
        long_term_summary_msg_count: totalMessages,
        updated_at: now,
        created_at: now,
        values_list: [],
      },
      update: {
        long_term_summary: summary,
        long_term_summary_at: now,
        long_term_summary_msg_count: totalMessages,
        updated_at: now,
      },
    });
    console.log('[summary] rebuilt', {
      user_id: userId,
      total_cross_session: totalMessages,
      input_messages: rows.length,
      had_summary: Boolean(summary),
    });
    return summary;
  } catch (error) {
    console.error('[summary] rebuild_failed', error);
    return cachedSummary;
  }
}

async function extractProfileFromConversation(
  userId: string,
  current: UserProfile | null,
): Promise<ProfileExtractionPayload | null> {
  const recentRows = await prisma.chatHistory.findMany({
    where: { user_id: userId },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: PROFILE_EXTRACTION_MESSAGE_LIMIT,
  });
  if (recentRows.length === 0) {
    return null;
  }
  const transcript = recentRows
    .reverse()
    .map((r) => {
      const role = String(r.sender ?? '') === 'user' ? 'User' : 'Dynamis';
      const clean = String(r.message ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      return `${role}: ${clean.slice(0, 600)}`;
    })
    .join('\n');

  const currentJson = JSON.stringify(
    {
      display_name: current?.display_name ?? null,
      role_context: current?.role_context ?? null,
      aspirations: current?.aspirations ?? null,
      strengths: current?.strengths ?? null,
      weaknesses: current?.weaknesses ?? null,
      values_list: current?.values_list ?? [],
      active_focus: current?.active_focus ?? null,
      notes: current?.notes ?? null,
    },
    null,
    2,
  );

  const extractorSystem = [
    'You maintain a structured profile of THIS user across sessions with Dynamis (an AI career copilot).',
    'You will be given the current profile and a transcript of the most recent turns.',
    'Update only fields that have CLEAR evidence in the new turns. Keep prior values otherwise.',
    'Do NOT invent facts. If a field has no clear evidence, return it unchanged or null.',
    'For values_list, return a deduplicated array of short strings (max 8).',
    '',
    'Respond ONLY with a single JSON object using these exact keys:',
    '{',
    '  "display_name": string | null,',
    '  "role_context": string | null,',
    '  "aspirations": string | null,',
    '  "strengths": string | null,',
    '  "weaknesses": string | null,',
    '  "values_list": string[],',
    '  "active_focus": string | null,',
    '  "notes": string | null',
    '}',
    'No prose, no markdown, no code fences. JSON only.',
  ].join('\n');

  const res = await anthropic.messages.create({
    model: PROFILE_EXTRACTION_MODEL,
    system: extractorSystem,
    max_tokens: PROFILE_EXTRACTION_MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: `CURRENT PROFILE (JSON):\n${currentJson}\n\nRECENT TRANSCRIPT:\n${transcript}\n\nReturn the updated JSON now.`,
      },
    ],
  });
  const block = res.content[0];
  if (!block || block.type !== 'text') {
    return null;
  }
  const raw = block.text.trim();
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    console.warn('[profile] extraction returned no json', {
      user_id: userId,
      sample: raw.slice(0, 200),
    });
    return null;
  }
  try {
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as ProfileExtractionPayload;
    return parsed;
  } catch (err) {
    console.warn('[profile] extraction json parse failed', { user_id: userId, error: String(err) });
    return null;
  }
}

function pickProfileString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 1000);
}

function pickProfileValuesList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const t = item.trim();
      if (t) out.push(t.slice(0, 80));
    }
    if (out.length >= 8) break;
  }
  return out;
}

async function persistProfileUpdate(
  userId: string,
  current: UserProfile | null,
  extracted: ProfileExtractionPayload,
): Promise<string[]> {
  const next = {
    display_name: pickProfileString(extracted.display_name) ?? current?.display_name ?? null,
    role_context: pickProfileString(extracted.role_context) ?? current?.role_context ?? null,
    aspirations: pickProfileString(extracted.aspirations) ?? current?.aspirations ?? null,
    strengths: pickProfileString(extracted.strengths) ?? current?.strengths ?? null,
    weaknesses: pickProfileString(extracted.weaknesses) ?? current?.weaknesses ?? null,
    values_list: pickProfileValuesList(extracted.values_list) ?? current?.values_list ?? [],
    active_focus: pickProfileString(extracted.active_focus) ?? current?.active_focus ?? null,
    notes: pickProfileString(extracted.notes) ?? current?.notes ?? null,
  };

  const fieldsChanged: string[] = [];
  const cmp = (key: keyof typeof next, before: unknown) => {
    const after = next[key];
    if (key === 'values_list') {
      const beforeArr = Array.isArray(before) ? (before as string[]) : [];
      const afterArr = next.values_list;
      if (JSON.stringify(beforeArr) !== JSON.stringify(afterArr)) fieldsChanged.push(key);
    } else if ((before ?? null) !== (after ?? null)) {
      fieldsChanged.push(key);
    }
  };
  cmp('display_name', current?.display_name);
  cmp('role_context', current?.role_context);
  cmp('aspirations', current?.aspirations);
  cmp('strengths', current?.strengths);
  cmp('weaknesses', current?.weaknesses);
  cmp('values_list', current?.values_list);
  cmp('active_focus', current?.active_focus);
  cmp('notes', current?.notes);

  if (fieldsChanged.length === 0) {
    return fieldsChanged;
  }

  const now = new Date();
  await prisma.userProfile.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      display_name: next.display_name,
      role_context: next.role_context,
      aspirations: next.aspirations,
      strengths: next.strengths,
      weaknesses: next.weaknesses,
      values_list: next.values_list ?? [],
      active_focus: next.active_focus,
      notes: next.notes,
      updated_at: now,
      created_at: now,
    },
    update: {
      display_name: next.display_name,
      role_context: next.role_context,
      aspirations: next.aspirations,
      strengths: next.strengths,
      weaknesses: next.weaknesses,
      values_list: next.values_list ?? [],
      active_focus: next.active_focus,
      notes: next.notes,
      updated_at: now,
    },
  });
  return fieldsChanged;
}

function enqueueProfileUpdate(userId: string): void {
  void (async () => {
    const startedAt = Date.now();
    try {
      const current = await loadUserProfile(userId);
      const extracted = await extractProfileFromConversation(userId, current);
      if (!extracted) {
        console.log('[profile] skipped', { user_id: userId, reason: 'no_extraction' });
        return;
      }
      const fieldsChanged = await persistProfileUpdate(userId, current, extracted);
      if (fieldsChanged.length === 0) {
        console.log('[profile] no_changes', {
          user_id: userId,
          elapsed_ms: Date.now() - startedAt,
        });
      } else {
        console.log('[profile] update', {
          user_id: userId,
          fields_changed: fieldsChanged,
          elapsed_ms: Date.now() - startedAt,
        });
      }
    } catch (err) {
      console.error('[profile] update_failed', { user_id: userId, error: String(err) });
    }
  })();
}

async function persistTurn(
  userId: string,
  sessionId: string,
  userMessage: string,
  aiResponse: string,
): Promise<void> {
  const userCreatedAt = new Date();
  const agentCreatedAt = new Date();
  await prisma.chatHistory.createMany({
    data: [
      {
        user_id: userId,
        session_id: sessionId,
        sender: 'user',
        message: userMessage,
        created_at: userCreatedAt,
      },
      {
        user_id: userId,
        session_id: sessionId,
        sender: 'agent',
        message: aiResponse,
        created_at: agentCreatedAt,
      },
    ],
  });
}

async function runAgentTurn(
  userId: string,
  sessionId: string,
  userMessage: string,
  opts: { voice?: boolean; alreadyIntroducedInSession?: boolean } = {},
): Promise<string> {
  const isVoice = opts.voice === true;
  const messageLimit = isVoice ? VOICE_RECENT_MESSAGE_LIMIT : RECENT_MESSAGE_LIMIT;
  const maxTokens = isVoice ? VOICE_MAX_TOKENS : RESPONSE_MAX_TOKENS;
  const startedAt = Date.now();
  const [prior, profile, firstEver] = await Promise.all([
    loadRecentHistory(userId, sessionId, messageLimit),
    loadUserProfile(userId),
    isFirstEverInteraction(userId),
  ]);
  const longTermSummary = await ensureUserSummaryFresh(userId, sessionId, profile, {
    allowRebuild: !isVoice,
  });

  const profileBlock = formatProfileForPrompt(profile);

  const stableParts: string[] = [ASSISTANT_SYSTEM_PROMPT];
  if (isVoice) {
    stableParts.push(VOICE_MODE_PROMPT);
  }
  if (profileBlock) {
    stableParts.push(`\n=== USER PROFILE ===\n${profileBlock}\n=== END USER PROFILE ===`);
  }
  if (longTermSummary) {
    stableParts.push(
      `\n=== USER BACKGROUND SUMMARY ===\n${longTermSummary}\n=== END USER BACKGROUND SUMMARY ===`,
    );
  }
  const stableSystem = stableParts.join('\n');

  const introInstruction = buildIntroductionSystemBlock(
    shouldOpenWithIntroduction(firstEver, prior, {
      ...(opts.alreadyIntroducedInSession
        ? { alreadyIntroducedInSession: opts.alreadyIntroducedInSession }
        : {}),
    }),
  );

  const systemBlocks: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[] = [
    {
      type: 'text',
      text: stableSystem,
      cache_control: { type: 'ephemeral' },
    },
  ];
  systemBlocks.push({ type: 'text', text: introInstruction });

  const messages = [...prior, { role: 'user' as const, content: userMessage }];

  const msg = await anthropic.messages.create({
    model: isVoice ? VOICE_MODEL : ANTHROPIC_MODEL,
    system: systemBlocks,
    max_tokens: maxTokens,
    messages,
  });
  const stopReason = (msg as { stop_reason?: string | null }).stop_reason ?? null;
  if (stopReason === 'max_tokens') {
    console.warn('[claude] max_tokens_reached', {
      session_id: sessionId,
      is_voice: isVoice,
      max_tokens: maxTokens,
    });
  }

  const block = msg.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected or empty response from Claude');
  }
  const aiResponse = block.text;

  const persistPromise = persistTurn(userId, sessionId, userMessage, aiResponse);
  if (!isVoice) {
    await persistPromise;
  } else {
    try {
      await persistPromise;
    } catch (e) {
      console.error('[persist] failed', e);
    }
  }

  const usage = msg.usage as
    | {
        input_tokens?: number;
        output_tokens?: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      }
    | undefined;
  console.log('[claude] reply ok', {
    chars: aiResponse.length,
    elapsed_ms: Date.now() - startedAt,
    session_id: sessionId,
    is_voice: isVoice,
    max_tokens: maxTokens,
    profile_present: Boolean(profileBlock),
    summary_present: Boolean(longTermSummary),
    first_ever: firstEver,
    usage: usage
      ? {
          input_tokens: usage.input_tokens ?? null,
          cache_read: usage.cache_read_input_tokens ?? null,
          cache_creation: usage.cache_creation_input_tokens ?? null,
          output_tokens: usage.output_tokens ?? null,
        }
      : null,
    stop_reason: stopReason,
  });

  if (!isVoice || PROFILE_UPDATE_ON_VOICE) {
    enqueueProfileUpdate(userId);
  }

  return aiResponse;
}

const TTS_TIMEOUT_MS = Number(process.env.TTS_TIMEOUT_MS ?? 9000);
const TTS_SAMPLE_RATE = Number(process.env.TTS_SAMPLE_RATE ?? 16000);
const CARTESIA_TTS_MAX_CONCURRENCY = Math.max(
  1,
  Number(process.env.CARTESIA_TTS_MAX_CONCURRENCY ?? 1),
);

// ── Session state machine ────────────────────────────────────────────────────
type SessionState =
  | 'listening'
  | 'user_speaking'
  | 'thinking'
  | 'assistant_speaking'
  | 'barge_in_pending';

type ClientSocketLike = {
  readyState: number;
  OPEN: number;
  send: (data: string) => void;
};

type VoiceStreamResult = {
  fullReply: string;
  chunkCount: number;
  reason: 'ok' | 'canceled' | 'error';
  ttaMs: number | null;
  totalMs: number;
};

let cartesiaTtsInFlight = 0;
const cartesiaTtsQueue: Array<() => void> = [];

function pumpCartesiaTtsQueue(): void {
  while (cartesiaTtsInFlight < CARTESIA_TTS_MAX_CONCURRENCY && cartesiaTtsQueue.length > 0) {
    const nextTask = cartesiaTtsQueue.shift();
    if (!nextTask) break;
    cartesiaTtsInFlight += 1;
    nextTask();
  }
}

function enqueueCartesiaTts<T>(
  task: () => Promise<T>,
  opts: { signal?: AbortSignal; tag?: string } = {},
): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    const enqueuedAt = Date.now();
    const runTask = () => {
      if (opts.signal?.aborted) {
        cartesiaTtsInFlight = Math.max(0, cartesiaTtsInFlight - 1);
        pumpCartesiaTtsQueue();
        resolve(null);
        return;
      }
      const waitMs = Date.now() - enqueuedAt;
      if (waitMs > 0) {
        console.log('[tts] queue_wait', {
          wait_ms: waitMs,
          in_flight: cartesiaTtsInFlight,
          pending: cartesiaTtsQueue.length,
          max_concurrency: CARTESIA_TTS_MAX_CONCURRENCY,
          tag: opts.tag ?? null,
        });
      }
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          cartesiaTtsInFlight = Math.max(0, cartesiaTtsInFlight - 1);
          pumpCartesiaTtsQueue();
        });
    };

    cartesiaTtsQueue.push(runTask);
    console.log('[tts] queued', {
      in_flight: cartesiaTtsInFlight,
      pending: cartesiaTtsQueue.length,
      max_concurrency: CARTESIA_TTS_MAX_CONCURRENCY,
      tag: opts.tag ?? null,
    });
    pumpCartesiaTtsQueue();
  });
}

function trimLeadingSpace(s: string): string {
  const ws = s.match(/^\s+/);
  return ws ? s.slice(ws[0].length) : s;
}

/**
 * Try to peel one sentence off the front of `buffer`.
 *
 * Strategy (in order):
 *  1) STRONG: first `. ! ?` whose cut position is >= MIN_SENTENCE_CHARS.
 *     If the very first sentence is shorter than MIN, we keep scanning forward
 *     instead of returning null (this is the bug-fix vs. the old version).
 *  2) SOFT: if buffer has grown past SOFT_FLUSH_CHARS, accept `, ; :` as a
 *     legit cut point so long replies without periods still flow.
 *  3) HARD: if buffer has grown past HARD_FLUSH_CHARS, force-cut at the last
 *     space (last resort: Claude returning prose with no punctuation at all).
 */
function extractCompleteSentence(buffer: string): { sentence: string; rest: string } | null {
  if (buffer.length < MIN_SENTENCE_CHARS) return null;

  STRONG_END_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STRONG_END_RE.exec(buffer)) !== null) {
    const cut = m.index + m[0].length;
    if (cut >= MIN_SENTENCE_CHARS) {
      return {
        sentence: buffer.slice(0, cut),
        rest: trimLeadingSpace(buffer.slice(cut)),
      };
    }
  }

  if (buffer.length >= SOFT_FLUSH_CHARS) {
    SOFT_END_RE.lastIndex = 0;
    while ((m = SOFT_END_RE.exec(buffer)) !== null) {
      const cut = m.index + 1;
      if (cut >= MIN_SENTENCE_CHARS) {
        return {
          sentence: buffer.slice(0, cut),
          rest: trimLeadingSpace(buffer.slice(cut)),
        };
      }
    }
  }

  if (buffer.length >= HARD_FLUSH_CHARS) {
    const slice = buffer.slice(0, HARD_FLUSH_CHARS);
    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace >= MIN_SENTENCE_CHARS) {
      return {
        sentence: buffer.slice(0, lastSpace),
        rest: buffer.slice(lastSpace + 1),
      };
    }
  }

  return null;
}

function safeSend(socket: ClientSocketLike, payload: unknown): boolean {
  if (socket.readyState !== socket.OPEN) {
    return false;
  }
  try {
    socket.send(JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[voice] send failed', err);
    return false;
  }
}

async function runAgentVoiceStream(
  userId: string,
  sessionId: string,
  userMessage: string,
  clientSocket: ClientSocketLike,
  signal: AbortSignal,
  opts: {
    interruptedReply?: string;
    onReplyProgress?: (text: string) => void;
    alreadyIntroducedInSession?: boolean;
  } = {},
): Promise<VoiceStreamResult> {
  const turnStartedAt = Date.now();
  const messageLimit = VOICE_RECENT_MESSAGE_LIMIT;
  const maxTokens = VOICE_MAX_TOKENS;

  const [prior, profile, firstEver] = await Promise.all([
    loadRecentHistory(userId, sessionId, messageLimit),
    loadUserProfile(userId),
    isFirstEverInteraction(userId),
  ]);
  const longTermSummary = await ensureUserSummaryFresh(userId, sessionId, profile, {
    allowRebuild: false,
  });

  const profileBlock = formatProfileForPrompt(profile);

  const stableParts: string[] = [ASSISTANT_SYSTEM_PROMPT, VOICE_MODE_PROMPT];
  if (profileBlock) {
    stableParts.push(`\n=== USER PROFILE ===\n${profileBlock}\n=== END USER PROFILE ===`);
  }
  if (longTermSummary) {
    stableParts.push(
      `\n=== USER BACKGROUND SUMMARY ===\n${longTermSummary}\n=== END USER BACKGROUND SUMMARY ===`,
    );
  }
  const stableSystem = stableParts.join('\n');

  const introInstruction = buildIntroductionSystemBlock(
    shouldOpenWithIntroduction(firstEver, prior, {
      ...(opts.alreadyIntroducedInSession
        ? { alreadyIntroducedInSession: opts.alreadyIntroducedInSession }
        : {}),
      ...(opts.interruptedReply?.trim() ? { interruptedReply: opts.interruptedReply } : {}),
    }),
  );

  const systemBlocks: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[] = [
    {
      type: 'text',
      text: stableSystem,
      cache_control: { type: 'ephemeral' },
    },
  ];
  systemBlocks.push({ type: 'text', text: introInstruction });

  // Build message list. If the user interrupted a previous turn, inject what
  // the agent had already said so Claude has full context to continue naturally.
  const messages: { role: 'user' | 'assistant'; content: string }[] = [...prior];
  if (opts.interruptedReply?.trim()) {
    messages.push({ role: 'assistant', content: opts.interruptedReply.trim() });
    console.log('[voice] barge_in_context', {
      session_id: sessionId,
      partial_chars: opts.interruptedReply.length,
      preview: opts.interruptedReply.slice(0, 80),
    });
  }
  messages.push({ role: 'user', content: userMessage });

  safeSend(clientSocket, {
    type: 'tts_audio_start',
    session_id: sessionId,
    mime_type: 'audio/mpeg',
  });

  let firstTokenAt: number | null = null;
  let firstChunkSentAt: number | null = null;
  let buffer = '';
  let fullReply = '';
  const replyDeltas: string[] = [];
  let dispatchedCount = 0;
  let chunksSent = 0;
  let lastError: unknown = null;

  // FIFO ordered send chain. Each sentence dispatch returns a Promise that
  // resolves with the audio; we chain `sendChain` so the client receives chunks
  // strictly in order even if a later sentence finishes TTS first.
  let sendChain: Promise<void> = Promise.resolve();

  const dispatchSentence = (text: string) => {
    if (!text.trim()) return;
    const seq = dispatchedCount++;
    const dispatchedAt = Date.now();
    console.log('[voice] sentence_dispatched', {
      session_id: sessionId,
      seq,
      chars: text.length,
      elapsed_ms: dispatchedAt - turnStartedAt,
      preview: text.slice(0, 60),
    });
    const ttsPromise = synthesizeSpeech(text, { signal, tag: `seq=${seq}` }).catch((err) => {
      console.error('[tts] sentence_failed', { seq, error: String(err) });
      lastError = err;
      return null;
    });
    sendChain = sendChain.then(async () => {
      if (signal.aborted) return;
      const audio = await ttsPromise;
      if (!audio || signal.aborted) return;
      const ok = safeSend(clientSocket, {
        type: 'tts_audio_chunk',
        session_id: sessionId,
        seq,
        audio_base64: audio.audioBase64,
      });
      if (ok) {
        chunksSent += 1;
        if (firstChunkSentAt === null) {
          firstChunkSentAt = Date.now();
          console.log('[voice] tta_ms', {
            session_id: sessionId,
            tta_ms: firstChunkSentAt - turnStartedAt,
            seq,
          });
          console.log('[tts] stream_first_chunk_ms', {
            session_id: sessionId,
            elapsed_ms: firstChunkSentAt - turnStartedAt,
          });
        }
      }
    });
  };

  let claudeReason: 'ok' | 'canceled' | 'error' = 'ok';
  let streamStopReason: string | null = null;
  let continuationSegments = 0;

  // Inner helper: drain one Claude stream segment into buffer/fullReply.
  const drainStream = async (
    continuationMessages: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<string | null> => {
    const stream = anthropic.messages.stream({
      model: VOICE_MODEL,
      system: systemBlocks,
      max_tokens: maxTokens,
      messages: continuationMessages,
    });

    let segmentStop: string | null = null;
    for await (const event of stream) {
      if (signal.aborted) {
        claudeReason = 'canceled';
        try {
          stream.controller.abort();
        } catch {
          /* no-op */
        }
        return 'canceled';
      }
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        if (!text) continue;
        replyDeltas.push(text);
        opts.onReplyProgress?.(replyDeltas.join(''));
        if (firstTokenAt === null) {
          firstTokenAt = Date.now();
          console.log('[claude] stream_first_token_ms', {
            session_id: sessionId,
            elapsed_ms: firstTokenAt - turnStartedAt,
            segment: continuationSegments,
          });
        }
        buffer += text;
        fullReply += text;
        while (true) {
          const split = extractCompleteSentence(buffer);
          if (!split) break;
          buffer = split.rest;
          dispatchSentence(split.sentence);
        }
      } else if (event.type === 'message_delta') {
        const maybeStop =
          (event as { delta?: { stop_reason?: string | null } }).delta?.stop_reason ?? null;
        if (maybeStop) segmentStop = maybeStop;
      }
    }
    return segmentStop;
  };

  try {
    // First segment uses the original message list.
    let currentMessages: { role: 'user' | 'assistant'; content: string }[] = [...messages];
    streamStopReason = await drainStream(currentMessages);

    // Continuation loop: if Claude hit max_tokens, ask it to keep going.
    // Limit to 2 extra continuations to avoid runaway cost.
    const MAX_CONTINUATIONS = 2;
    while (
      streamStopReason === 'max_tokens' &&
      continuationSegments < MAX_CONTINUATIONS &&
      !signal.aborted
    ) {
      continuationSegments += 1;
      const partialSoFar = replyDeltas.join('');
      console.log('[claude] continuation_started', {
        session_id: sessionId,
        segment: continuationSegments,
        chars_so_far: partialSoFar.length,
      });
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: partialSoFar },
        { role: 'user', content: 'Continue.' },
      ];
      streamStopReason = await drainStream(currentMessages);
    }

    if (!signal.aborted) {
      const tail = buffer.trim();
      if (tail) {
        dispatchSentence(tail);
        buffer = '';
      }
    }
  } catch (err) {
    claudeReason = signal.aborted ? 'canceled' : 'error';
    lastError = err;
    console.error('[claude] stream_failed', err);
    const tail = buffer.trim();
    if (tail && !signal.aborted) {
      try {
        dispatchSentence(tail);
        buffer = '';
      } catch {
        /* no-op */
      }
    }
  }

  const finalReply = replyDeltas.join('');
  if (streamStopReason === 'max_tokens') {
    console.warn('[claude] stream_max_tokens_reached', {
      session_id: sessionId,
      max_tokens: maxTokens,
      chars_so_far: finalReply.length,
      continuations: continuationSegments,
    });
  }

  // Wait for the FIFO send chain to finish (or be cancelled).
  try {
    await sendChain;
  } catch (err) {
    console.error('[voice] send_chain_failed', err);
    lastError = err;
  }

  let reason: 'ok' | 'canceled' | 'error' = 'ok';
  if (signal.aborted) {
    reason = 'canceled';
  } else if (claudeReason === 'error' || lastError) {
    reason = 'error';
  }

  safeSend(clientSocket, {
    type: 'tts_audio_end',
    session_id: sessionId,
    total_chunks: chunksSent,
    reason,
  });

  if (finalReply.trim()) {
    safeSend(clientSocket, {
      type: 'agent_reply',
      text: finalReply,
      session_id: sessionId,
    });
  }

  const totalMs = Date.now() - turnStartedAt;
  console.log('[voice] turn_total_ms', {
    session_id: sessionId,
    total_ms: totalMs,
    chunks_sent: chunksSent,
    chars: finalReply.length,
    profile_present: Boolean(profileBlock),
    summary_present: Boolean(longTermSummary),
    first_ever: firstEver,
    first_token_ms: firstTokenAt ? firstTokenAt - turnStartedAt : null,
    first_chunk_ms: firstChunkSentAt ? firstChunkSentAt - turnStartedAt : null,
    stop_reason: streamStopReason,
    reason,
  });

  if (finalReply.trim()) {
    try {
      await persistTurn(userId, sessionId, userMessage, finalReply);
    } catch (e) {
      console.error('[persist] failed', e);
    }
    if (PROFILE_UPDATE_ON_VOICE) {
      enqueueProfileUpdate(userId);
    }
  }

  return {
    fullReply: finalReply,
    chunkCount: chunksSent,
    reason,
    ttaMs: firstChunkSentAt ? firstChunkSentAt - turnStartedAt : null,
    totalMs,
  };
}

async function synthesizeSpeechNow(
  text: string,
  opts: { signal?: AbortSignal; tag?: string } = {},
): Promise<{ audioBase64: string; mimeType: string } | null> {
  const cartesiaApiKey = process.env.CARTESIA_API_KEY;
  if (!cartesiaApiKey) {
    console.warn('[tts] skipped: CARTESIA_API_KEY missing');
    return null;
  }
  if (!text.trim()) {
    console.warn('[tts] skipped: empty text');
    return null;
  }

  const startedAt = Date.now();
  const modelId = process.env.CARTESIA_MODEL_ID ?? 'sonic-2';
  const voiceId = process.env.CARTESIA_VOICE_ID ?? '794f9389-aac1-45b6-b726-9d9369183238';
  const language = process.env.CARTESIA_LANGUAGE ?? 'pt';

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
  const externalAbort = () => controller.abort();
  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener('abort', externalAbort, { once: true });
  }

  let response: Response;
  try {
    response = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cartesiaApiKey}`,
        'Content-Type': 'application/json',
        'Cartesia-Version': process.env.CARTESIA_VERSION ?? '2025-04-16',
      },
      body: JSON.stringify({
        model_id: modelId,
        transcript: text,
        voice: { mode: 'id', id: voiceId },
        output_format: { container: 'mp3', encoding: 'mp3', sample_rate: TTS_SAMPLE_RATE },
        language,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error & { name?: string }).name === 'AbortError') {
      if (opts.signal?.aborted) {
        return null;
      }
      console.error('[tts] timeout', {
        elapsed_ms: Date.now() - startedAt,
        limit_ms: TTS_TIMEOUT_MS,
        tag: opts.tag ?? null,
      });
      throw new Error(`Cartesia timeout after ${TTS_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
    if (opts.signal) opts.signal.removeEventListener('abort', externalAbort);
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error('[tts] cartesia http error', response.status, errText.slice(0, 500));
    throw new Error(`Cartesia error ${response.status}: ${errText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  if (audioBuffer.length < 1000) {
    console.warn('[tts] suspiciously small audio', {
      bytes: audioBuffer.length,
      tag: opts.tag ?? null,
    });
  }
  const elapsedMs = Date.now() - startedAt;
  console.log('[tts] ok', {
    bytes: audioBuffer.length,
    elapsed_ms: elapsedMs,
    voice_id: voiceId,
    model_id: modelId,
    language,
    tag: opts.tag ?? null,
  });
  return {
    audioBase64: audioBuffer.toString('base64'),
    mimeType: 'audio/mpeg',
  };
}

async function synthesizeSpeech(
  text: string,
  opts: { signal?: AbortSignal; tag?: string } = {},
): Promise<{ audioBase64: string; mimeType: string } | null> {
  return enqueueCartesiaTts(() => synthesizeSpeechNow(text, opts), opts);
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req: import('express').Request, res: import('express').Response) => {
  res.status(200).json({ ok: true });
});

app.post('/chat', async (req: import('express').Request, res: import('express').Response) => {
  try {
    if (!isRequestAuthorized(req)) {
      return res.status(401).json({ error: 'Acesso não autorizado' });
    }

    const userId = String(req.body?.user_id ?? '').trim();
    const rawSessionId = String(req.body?.session_id ?? '').trim();
    const userMessage = String(req.body?.message ?? '').trim();

    if (!userId || !isValidUuid(userId)) {
      return res.status(400).json({
        error: 'Invalid or missing user_id. Expected UUID.',
      });
    }
    if (!userMessage) {
      return res.status(400).json({
        error: 'Invalid or missing message.',
      });
    }

    const sessionId = rawSessionId || randomUUID();
    if (!isValidUuid(sessionId)) {
      return res.status(400).json({
        error: 'Invalid session_id. Expected UUID.',
      });
    }

    const reply = await runAgentTurn(userId, sessionId, userMessage);
    const { profile_signals, insight } = await buildDiscoverySignalsPayload(userId);
    return res.status(200).json({
      reply,
      session_id: sessionId,
      profile_signals,
      insight,
    });
  } catch (error) {
    console.error('POST /chat error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get(
  '/discovery-signals',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const userId = String(req.query.user_id ?? '').trim();
      if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({
          error: 'Invalid or missing user_id. Expected UUID.',
        });
      }

      const payload = await buildDiscoverySignalsPayload(userId);
      return res.status(200).json(payload);
    } catch (error) {
      console.error('GET /discovery-signals error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

app.post(
  '/possibility-map',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const userId = String(req.body?.user_id ?? '').trim();
      if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({
          error: 'Invalid or missing user_id. Expected UUID.',
        });
      }

      const profile = await loadUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: 'profile not ready' });
      }

      const userPrompt = formatProfileForPossibilityMapPrompt(profile);
      const llmRes = await anthropic.messages.create({
        model: SUMMARY_MODEL,
        system: POSSIBILITY_MAP_SYSTEM_PROMPT,
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: `Intent profile:\n${userPrompt}\n\nReturn the JSON now.`,
          },
        ],
      });

      const block = llmRes.content[0];
      if (!block || block.type !== 'text') {
        return res.status(500).json({ error: 'Failed to parse LLM response.' });
      }

      const parsed = extractJsonObjectFromText(block.text);
      if (parsed === null) {
        return res.status(500).json({ error: 'Failed to parse LLM response.' });
      }

      const dimensions = buildPossibilityMapDimensions(parsed);
      return res.status(200).json({
        dimensions,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('POST /possibility-map error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

app.post(
  '/transformation-plan',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const userId = String(req.body?.user_id ?? '').trim();
      if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({
          error: 'Invalid or missing user_id. Expected UUID.',
        });
      }

      const profile = await loadUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: 'profile not ready' });
      }

      const userPrompt = formatProfileForPossibilityMapPrompt(profile);
      const llmRes = await anthropic.messages.create({
        model: SUMMARY_MODEL,
        system: TRANSFORMATION_PLAN_SYSTEM_PROMPT,
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: `Intent profile:\n${userPrompt}\n\nReturn the JSON now.`,
          },
        ],
      });

      const block = llmRes.content[0];
      let parsed: unknown | null = null;
      if (block && block.type === 'text') {
        parsed = extractJsonObjectFromText(block.text);
      }

      const goals = buildTransformationPlanGoals(parsed);
      return res.status(200).json({
        goals,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('POST /transformation-plan error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

const REFLECTION_SUMMARY_SYSTEM_PROMPT = [
  "You are summarizing a user's daily check-in for Dynamis, a career transformation product. The user just had a conversation reflecting on their day.",
  'Extract from the conversation:',
  '1. What they actually did today (concrete actions, not feelings). 3-6 items.',
  '2. What they said they want to do tomorrow. 2-4 items.',
  "3. A short, warm celebration message (1-2 sentences) that acknowledges SPECIFIC things they accomplished — not generic 'great job!' fluff.",
  "If the user didn't mention something for a category, leave that array empty. Don't invent things they didn't say.",
  'Output ONLY valid JSON, no markdown, no preamble, exact shape:',
  '{"did_today":["..."],"plan_tomorrow":["..."],"celebration":"..."}',
].join('\n');

const REFLECTION_SUMMARY_FALLBACK: {
  did_today: string[];
  plan_tomorrow: string[];
  celebration: string;
} = {
  did_today: [],
  plan_tomorrow: [],
  celebration: 'Você fez seu check-in hoje. Continue assim — cada conversa conta.',
};
function normalizeReflectionMessages(
  raw: unknown,
): Array<{ role: 'user' | 'assistant'; text: string }> | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const messages: Array<{ role: 'user' | 'assistant'; text: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const role = String((item as { role?: unknown }).role ?? '').trim();
    const text = String((item as { text?: unknown }).text ?? '').trim();
    if (!text) {
      continue;
    }
    if (role !== 'user' && role !== 'assistant') {
      continue;
    }
    messages.push({ role, text });
  }

  return messages.length > 0 ? messages : null;
}

function formatReflectionConversation(
  messages: Array<{ role: 'user' | 'assistant'; text: string }>,
): string {
  return messages
    .map((message) => {
      const speaker = message.role === 'user' ? 'User' : 'Agent';
      return `${speaker}: ${message.text}`;
    })
    .join('\n');
}

function buildReflectionSummaryResult(parsed: unknown | null): typeof REFLECTION_SUMMARY_FALLBACK {
  if (!parsed || typeof parsed !== 'object') {
    return { ...REFLECTION_SUMMARY_FALLBACK };
  }

  const record = parsed as {
    did_today?: unknown;
    plan_tomorrow?: unknown;
    celebration?: unknown;
  };

  const didToday = Array.isArray(record.did_today)
    ? record.did_today
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, 6)
    : [];

  const planTomorrow = Array.isArray(record.plan_tomorrow)
    ? record.plan_tomorrow
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, 4)
    : [];

  const celebration =
    typeof record.celebration === 'string' && record.celebration.trim().length > 0
      ? record.celebration.trim()
      : REFLECTION_SUMMARY_FALLBACK.celebration;

  return {
    did_today: didToday,
    plan_tomorrow: planTomorrow,
    celebration,
  };
}

app.post(
  '/watchtower-recommendations',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const userId = String(req.body?.user_id ?? '').trim();
      if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({
          error: 'Invalid or missing user_id. Expected UUID.',
        });
      }

      const profile = await loadUserProfile(userId);
      if (!isProfileSufficientForWatchtower(profile)) {
        console.log('[watchtower] insufficient_profile', { user_id: userId });
        return res.status(200).json({
          recommendations: [],
          reason: 'insufficient_profile',
        });
      }

      const userPrompt = formatProfileForWatchtowerPrompt(profile!);
      const llmRes = await anthropic.messages.create({
        model: SUMMARY_MODEL,
        system: WATCHTOWER_RECOMMENDATIONS_SYSTEM_PROMPT,
        max_tokens: WATCHTOWER_MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: `Intent profile:\n${userPrompt}\n\nReturn the JSON now.`,
          },
        ],
      });

      const block = llmRes.content[0];
      let parsed: unknown | null = null;
      if (block && block.type === 'text') {
        parsed = extractJsonObjectFromText(block.text);
      }

      if (parsed === null) {
        console.warn('[watchtower] llm json parse failed', { user_id: userId });
        return res.status(200).json({ recommendations: [] });
      }

      const recommendations = buildWatchtowerRecommendations(parsed, userId);
      console.log('[watchtower] generated', {
        user_id: userId,
        count: recommendations.length,
      });
      return res.status(200).json({ recommendations });
    } catch (error) {
      console.error('POST /watchtower-recommendations error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

app.post(
  '/reflection-summary',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const userId = String(req.body?.user_id ?? '').trim();
      if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({
          error: 'Invalid or missing user_id. Expected UUID.',
        });
      }

      const messages = normalizeReflectionMessages(req.body?.messages);
      if (!messages) {
        return res.status(400).json({ error: 'empty conversation' });
      }

      const profile = await loadUserProfile(userId);
      const profileContext = profile
        ? formatProfileForPossibilityMapPrompt(profile)
        : 'No intent profile captured yet.';

      const conversation = formatReflectionConversation(messages);
      const llmRes = await anthropic.messages.create({
        model: SUMMARY_MODEL,
        system: REFLECTION_SUMMARY_SYSTEM_PROMPT,
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: `Intent profile (context):\n${profileContext}\n\nConversation:\n${conversation}\n\nReturn the JSON now.`,
          },
        ],
      });

      const block = llmRes.content[0];
      let parsed: unknown | null = null;
      if (block && block.type === 'text') {
        parsed = extractJsonObjectFromText(block.text);
      }

      const summary = buildReflectionSummaryResult(parsed);
      return res.status(200).json({
        ...summary,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('POST /reflection-summary error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

app.post(
  '/livekit/token',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
        console.error('[livekit] misconfigured: LIVEKIT_URL/API_KEY/API_SECRET missing');
        return res.status(500).json({ error: 'LiveKit is not configured.' });
      }

      const userId = String(req.body?.userId ?? '').trim();
      const roomName = String(req.body?.roomName ?? '').trim();

      if (!userId) {
        return res.status(400).json({ error: 'Invalid or missing userId.' });
      }
      if (!roomName) {
        return res.status(400).json({ error: 'Invalid or missing roomName.' });
      }

      const accessToken = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity: userId,
      });
      accessToken.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
      });

      const token = await accessToken.toJwt();
      console.log('[livekit] token_issued', { userId, roomName });

      return res.status(200).json({ token, url: LIVEKIT_URL });
    } catch (error) {
      console.error('POST /livekit/token error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

const voiceWss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  try {
    const incomingUrl = new URL(
      request.url ?? '/',
      `http://${request.headers.host ?? 'localhost'}`,
    );
    if (incomingUrl.pathname !== VOICE_PATH) {
      socket.destroy();
      return;
    }

    if (!isRequestAuthorized(request)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const userId = incomingUrl.searchParams.get('user_id') ?? '';
    const incomingSessionId = incomingUrl.searchParams.get('session_id') ?? '';
    const sampleRate = Number(incomingUrl.searchParams.get('sample_rate') ?? VOICE_SAMPLE_RATE);
    const sessionId = incomingSessionId || randomUUID();

    const rawEndpointing =
      incomingUrl.searchParams.get('endpointing_ms') ??
      incomingUrl.searchParams.get('min_silence_ms');
    let endpointingMs: number | undefined;
    if (rawEndpointing !== null) {
      const parsed = Number(rawEndpointing);
      if (Number.isFinite(parsed) && parsed >= 200 && parsed <= 20000) {
        endpointingMs = Math.round(parsed);
      } else {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    if (!isValidUuid(userId) || !isValidUuid(sessionId)) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const rawMode = incomingUrl.searchParams.get('mode') ?? 'full';
    const mode: VoiceSessionMode = rawMode === 'stt_only' ? 'stt_only' : 'full';

    const context: VoiceSessionContext = {
      userId,
      sessionId,
      sampleRate,
      mode,
      ...(endpointingMs ? { endpointingMs } : {}),
    };
    voiceWss.handleUpgrade(request, socket, head, (clientSocket) => {
      voiceWss.emit('connection', clientSocket, request, context);
    });
  } catch {
    socket.destroy();
  }
});

voiceWss.on(
  'connection',
  (
    clientSocket: import('ws').WebSocket,
    _request: import('node:http').IncomingMessage,
    context: VoiceSessionContext,
  ) => {
    const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!assemblyApiKey) {
      clientSocket.send(
        JSON.stringify({
          type: 'error',
          code: 'assembly_not_configured',
          message: 'ASSEMBLYAI_API_KEY is missing.',
        }),
      );
      clientSocket.close();
      return;
    }

    const assemblyWsUrl = new URL(
      process.env.ASSEMBLYAI_REALTIME_URL ?? 'wss://streaming.assemblyai.com/v3/ws',
    );
    assemblyWsUrl.searchParams.set('sample_rate', String(context.sampleRate));
    assemblyWsUrl.searchParams.set('format_turns', 'true');
    assemblyWsUrl.searchParams.set(
      'speech_model',
      process.env.ASSEMBLYAI_SPEECH_MODEL ?? 'u3-rt-pro',
    );

    const envFloorRaw = process.env.ASSEMBLYAI_MAX_TURN_SILENCE_MS ?? '1500';
    const envFloor = envFloorRaw ? Number(envFloorRaw) : undefined;
    const queryValue = context.endpointingMs;
    let maxTurnSilenceMs: number | undefined;
    let source: 'query' | 'env' | 'env_floor' | undefined;
    if (envFloor && Number.isFinite(envFloor) && queryValue) {
      maxTurnSilenceMs = Math.max(envFloor, queryValue);
      source = maxTurnSilenceMs === envFloor && envFloor > queryValue ? 'env_floor' : 'query';
    } else if (queryValue) {
      maxTurnSilenceMs = queryValue;
      source = 'query';
    } else if (envFloor && Number.isFinite(envFloor)) {
      maxTurnSilenceMs = envFloor;
      source = 'env';
    }
    if (maxTurnSilenceMs) {
      assemblyWsUrl.searchParams.set('max_turn_silence', String(maxTurnSilenceMs));
      console.log('[voice] endpointing config', {
        session_id: context.sessionId,
        max_turn_silence_ms: maxTurnSilenceMs,
        query_value: queryValue ?? null,
        env_floor: envFloor ?? null,
        source,
      });
    }

    const assemblySocket = new WebSocket(assemblyWsUrl.toString(), {
      headers: { Authorization: assemblyApiKey },
    });

    let audioChunkCount = 0;
    let assemblyOpened = false;

    console.log('[voice] connection opened', {
      session_id: context.sessionId,
      user_id: context.userId,
      sample_rate: context.sampleRate,
    });

    clientSocket.send(
      JSON.stringify({
        type: 'ready',
        session_id: context.sessionId,
        sample_rate: context.sampleRate,
      }),
    );
    console.log('[voice] ready sent', { session_id: context.sessionId });

    let processing: Promise<void> = Promise.resolve();
    let activeController: AbortController | null = null;

    // ── Session state machine ────────────────────────────────────────────────
    let sessionState: SessionState = 'listening';

    const transitionState = (next: SessionState) => {
      const prev = sessionState;
      sessionState = next;
      console.log('[voice] state', {
        session_id: context.sessionId,
        from: prev,
        to: next,
      });
      if (clientSocket.readyState === clientSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({ type: 'session_state', state: next, session_id: context.sessionId }),
        );
      }
    };

    // Tracks the text the agent has emitted so far in the current turn.
    // Used to inject barge-in context into the next turn.
    let activePartialReply = '';
    // Stores partial text when a turn is interrupted, for next turn.
    let interruptedReplyForNext = '';

    let introducedThisSession = false;

    const runStreamingTurn = async (
      transcript: string,
      signal: AbortSignal,
      interruptedReply = '',
    ) => {
      activePartialReply = '';

      // Notify app that Claude started thinking.
      if (clientSocket.readyState === clientSocket.OPEN) {
        clientSocket.send(JSON.stringify({ type: 'turn_started', session_id: context.sessionId }));
      }
      transitionState('thinking');

      // ── Turn timeout ─────────────────────────────────────────────────────
      const turnTimeoutHandle = setTimeout(() => {
        if (!signal.aborted) {
          console.warn('[voice] turn_timeout', {
            session_id: context.sessionId,
            timeout_ms: TURN_TIMEOUT_MS,
          });
          signal.dispatchEvent?.(new Event('abort'));
          activeController?.abort();
        }
      }, TURN_TIMEOUT_MS);

      try {
        const result = await runAgentVoiceStream(
          context.userId,
          context.sessionId,
          transcript,
          clientSocket as unknown as ClientSocketLike,
          signal,
          {
            interruptedReply,
            alreadyIntroducedInSession: introducedThisSession,
            onReplyProgress: (text) => {
              activePartialReply = text;
              if (sessionState === 'thinking') transitionState('assistant_speaking');
            },
          },
        );
        if (result.fullReply.trim()) {
          introducedThisSession = true;
        }
        if (!signal.aborted) transitionState('listening');
      } catch (err) {
        if (signal.aborted) {
          console.log('[voice] turn canceled', { session_id: context.sessionId });
          if (clientSocket.readyState === clientSocket.OPEN) {
            clientSocket.send(
              JSON.stringify({ type: 'turn_canceled', session_id: context.sessionId }),
            );
          }
          transitionState('listening');
          return;
        }
        console.error('[voice] streaming_turn_failed', err);
        transitionState('listening');
        if (clientSocket.readyState === clientSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              type: 'tts_audio_end',
              session_id: context.sessionId,
              total_chunks: 0,
              reason: 'error',
            }),
          );
          clientSocket.send(
            JSON.stringify({
              type: 'warning',
              code: 'agent_failed',
              message: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      } finally {
        clearTimeout(turnTimeoutHandle);
      }
    };

    const runLegacyTurn = async (transcript: string, signal: AbortSignal) => {
      try {
        const reply = await runAgentTurn(context.userId, context.sessionId, transcript, {
          voice: true,
          alreadyIntroducedInSession: introducedThisSession,
        });
        if (reply.trim()) {
          introducedThisSession = true;
        }
        if (signal.aborted) return;
        if (clientSocket.readyState === clientSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              type: 'agent_reply',
              text: reply,
              session_id: context.sessionId,
            }),
          );
          console.log('[voice] agent_reply sent', {
            session_id: context.sessionId,
            chars: reply.length,
          });
        } else {
          console.warn('[voice] agent_reply skipped: client socket not open');
          return;
        }

        try {
          const tts = await synthesizeSpeech(reply, { signal });
          if (signal.aborted) return;
          if (tts) {
            if (clientSocket.readyState === clientSocket.OPEN) {
              clientSocket.send(
                JSON.stringify({
                  type: 'tts_audio',
                  mime_type: tts.mimeType,
                  audio_base64: tts.audioBase64,
                }),
              );
              console.log('[voice] tts_audio sent', {
                bytes: tts.audioBase64.length,
                session_id: context.sessionId,
              });
            } else {
              console.warn('[voice] tts_audio skipped: client socket not open');
            }
          } else if (clientSocket.readyState === clientSocket.OPEN) {
            clientSocket.send(
              JSON.stringify({
                type: 'warning',
                code: 'tts_disabled',
                message: 'TTS not configured on server.',
              }),
            );
          }
        } catch (ttsError) {
          if (signal.aborted) return;
          console.error('[voice] tts_failed', ttsError);
          if (clientSocket.readyState === clientSocket.OPEN) {
            clientSocket.send(
              JSON.stringify({
                type: 'warning',
                code: 'tts_failed',
                message: ttsError instanceof Error ? ttsError.message : String(ttsError),
              }),
            );
          }
        }
      } catch (err) {
        if (signal.aborted) return;
        if (clientSocket.readyState === clientSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              type: 'error',
              code: 'agent_failed',
              message: String(err),
            }),
          );
        }
      }
    };

    const enqueueResponse = (transcript: string) => {
      // If a turn is already running, capture what was said so far (barge-in
      // context) and abort. The new turn will inject it into Claude's history.
      if (activeController && !activeController.signal.aborted) {
        const partial = activePartialReply.trim();
        if (partial) {
          interruptedReplyForNext = partial;
          console.log('[voice] barge_in', {
            session_id: context.sessionId,
            partial_chars: partial.length,
          });
        } else {
          interruptedReplyForNext = '';
        }
        // Notify app the previous turn was canceled before we start the new one.
        if (clientSocket.readyState === clientSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({ type: 'turn_canceled', session_id: context.sessionId }),
          );
        }
        activeController.abort();
        transitionState('barge_in_pending');
      }
      const controller = new AbortController();
      activeController = controller;
      activePartialReply = '';

      const capturedInterrupted = interruptedReplyForNext;
      interruptedReplyForNext = '';

      processing = processing
        .then(async () => {
          if (controller.signal.aborted) return;
          if (VOICE_TTS_MODE === 'legacy') {
            await runLegacyTurn(transcript, controller.signal);
          } else {
            await runStreamingTurn(transcript, controller.signal, capturedInterrupted);
          }
        })
        .catch((err) => {
          console.error('[voice] turn_failed', err);
        })
        .finally(() => {
          if (activeController === controller) {
            activeController = null;
          }
        });
    };

    assemblySocket.on('open', () => {
      assemblyOpened = true;
      console.log('[voice] assembly socket opened', {
        session_id: context.sessionId,
        user_id: context.userId,
      });
      if (clientSocket.readyState === clientSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            type: 'stt_ready',
            session_id: context.sessionId,
          }),
        );
        console.log('[voice] stt_ready sent', { session_id: context.sessionId });
      }
    });

    assemblySocket.on('message', (rawMessage: import('ws').RawData) => {
      let payload: unknown;
      try {
        payload = JSON.parse(rawMessage.toString('utf8'));
      } catch {
        return;
      }

      const message = payload as { type?: string; transcript?: string; end_of_turn?: boolean };
      if (message.type === 'Turn') {
        const transcript = String(message.transcript ?? '').trim();
        const endOfTurn = Boolean(message.end_of_turn);
        if (clientSocket.readyState === clientSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              type: endOfTurn ? 'transcript_final' : 'transcript_partial',
              text: transcript,
            }),
          );
        }
        if (endOfTurn) {
          console.log('[stt] final', { session_id: context.sessionId, chars: transcript.length });
          if (sessionState !== 'thinking' && sessionState !== 'barge_in_pending') {
            transitionState('user_speaking');
          }
        } else if (transcript) {
          console.log('[stt] partial', { session_id: context.sessionId, chars: transcript.length });
        }
        if (endOfTurn && transcript && context.mode !== 'stt_only') {
          enqueueResponse(transcript);
        }
      } else if (message.type === 'Termination') {
        if (clientSocket.readyState === clientSocket.OPEN) {
          clientSocket.send(JSON.stringify({ type: 'terminated' }));
        }
      }
    });

    assemblySocket.on('error', (err) => {
      console.error('[voice] assembly socket error', err);
      if (clientSocket.readyState === clientSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            type: 'error',
            code: 'assembly_socket_error',
            message: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    });

    assemblySocket.on('close', (code: number, reason: Buffer) => {
      const reasonText = reason?.toString('utf8') ?? '';
      console.warn('[voice] assembly socket closed', {
        code,
        reason: reasonText,
        opened: assemblyOpened,
        chunks_received: audioChunkCount,
        session_id: context.sessionId,
      });
      if (clientSocket.readyState === clientSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            type: 'error',
            code: 'assembly_closed',
            message: `Assembly closed (code=${code}) ${reasonText}`,
          }),
        );
        clientSocket.close();
      }
    });

    clientSocket.on('message', (rawClientMessage: import('ws').RawData) => {
      let event: unknown;
      try {
        event = JSON.parse(rawClientMessage.toString('utf8'));
      } catch {
        clientSocket.send(
          JSON.stringify({ type: 'error', code: 'invalid_json', message: 'Invalid JSON.' }),
        );
        return;
      }

      const message = event as { type?: string; audio_base64?: string };
      if (message.type === 'audio_chunk') {
        const audioBase64 = String(message.audio_base64 ?? '');
        if (!audioBase64) {
          return;
        }
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        if (assemblySocket.readyState === assemblySocket.OPEN) {
          audioChunkCount += 1;
          assemblySocket.send(audioBuffer);
        }
      } else if (message.type === 'interrupt') {
        // App detected the user started speaking during TTS playback.
        // Abort the current turn, capture partial reply as context for the next one.
        if (activeController && !activeController.signal.aborted) {
          const partial = activePartialReply.trim();
          interruptedReplyForNext = partial;
          console.log('[voice] interrupt_received', {
            session_id: context.sessionId,
            had_partial: Boolean(partial),
            partial_chars: partial.length,
          });
          if (clientSocket.readyState === clientSocket.OPEN) {
            clientSocket.send(
              JSON.stringify({ type: 'turn_canceled', session_id: context.sessionId }),
            );
          }
          transitionState('barge_in_pending');
          activeController.abort();
        } else {
          console.log('[voice] interrupt_received_no_active_turn', {
            session_id: context.sessionId,
          });
        }
        // Acknowledge so the app knows the backend processed it.
        if (clientSocket.readyState === clientSocket.OPEN) {
          clientSocket.send(
            JSON.stringify({
              type: 'interrupt_ack',
              session_id: context.sessionId,
            }),
          );
        }
      } else if (message.type === 'terminate') {
        if (assemblySocket.readyState === assemblySocket.OPEN) {
          assemblySocket.send(JSON.stringify({ type: 'Terminate' }));
        }
      }
    });

    clientSocket.on('close', (code: number, reason: Buffer) => {
      console.log('[voice] client socket closed', {
        code,
        reason: reason?.toString('utf8') ?? '',
        chunks_received: audioChunkCount,
        session_id: context.sessionId,
        final_state: sessionState,
      });
      if (activeController && !activeController.signal.aborted) {
        activeController.abort();
      }
      sessionState = 'listening';
      if (assemblySocket.readyState === assemblySocket.OPEN) {
        assemblySocket.send(JSON.stringify({ type: 'Terminate' }));
        assemblySocket.close();
      }
    });
  },
);

void connectPrisma()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
      console.log('[tts] init', {
        has_key: Boolean(process.env.CARTESIA_API_KEY),
        voice_id: process.env.CARTESIA_VOICE_ID ?? '794f9389-aac1-45b6-b726-9d9369183238',
        model_id: process.env.CARTESIA_MODEL_ID ?? 'sonic-2',
        language: process.env.CARTESIA_LANGUAGE ?? 'pt',
        mode: VOICE_TTS_MODE,
        min_sentence_chars: MIN_SENTENCE_CHARS,
        soft_flush_chars: SOFT_FLUSH_CHARS,
        hard_flush_chars: HARD_FLUSH_CHARS,
        max_concurrency: CARTESIA_TTS_MAX_CONCURRENCY,
      });
    });
  })
  .catch((error) => {
    console.error('[prisma] connection failed', error);
    process.exit(1);
  });

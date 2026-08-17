const { randomUUID, timingSafeEqual } = require('node:crypto') as typeof import('node:crypto');
const { createServer } = require('node:http') as typeof import('node:http');
const express = require('express') as typeof import('express');
const cors = require('cors') as typeof import('cors');
const { PrismaClient } = require('./generated/prisma') as typeof import('./generated/prisma');
const { createProfilesRepo, ProfileConflictError, ProfileNotFoundError, ProfileValidationError } =
  require('./profiles') as typeof import('./profiles');
const { createPortfolioRepo, PortfolioNotFoundError, PortfolioValidationError } =
  require('./portfolio') as typeof import('./portfolio');
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
  String(process.env.PROFILE_UPDATE_ON_VOICE ?? 'true').toLowerCase() !== 'false';
const VOICE_TTS_MODE = (process.env.VOICE_TTS_MODE ?? 'streaming').toLowerCase();
const VOICE_AGENT_OPENS = String(process.env.VOICE_AGENT_OPENS ?? 'true').toLowerCase() !== 'false';
const VOICE_SESSION_OPEN_USER_MESSAGE =
  '[Voice session started. The user is listening and has not spoken yet.]';
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
    'Your job is to HELP them organize their life toward what matters — not to run a',
    'therapy-style interview. A short first-pass conversation (about 3–4 user turns)',
    'learns who they are and what they want so you can start helping concretely.',
    '',
    "=== PHASE FRAMING (say this early, lightly, in the user's language — not every turn) ===",
    'You are getting to know them so you can help them get organized and move forward.',
    'This is a first pass; they can go deeper anytime. Make it clear you are here to HELP,',
    'not only to ask questions.',
    '=== END PHASE FRAMING ===',
    '',
    '=== HELP COMMITMENT (critical — do not skip) ===',
    'As soon as you understand a concrete struggle or goal (studies, deadlines, focus,',
    'career, habits, etc.), STATE that you will help them organize around it.',
    'Do this BEFORE or WITH your next question — never only validate and interrogate.',
    'If the user explicitly asks for help ("help me", "I need a plan", "can you organize"),',
    'COMMIT immediately: acknowledge the problem in their words, say you will help them',
    'get organized on that, and propose one concrete next step or a simple plan shape.',
    'Do NOT answer a help request with only another clarifying question.',
    'Example spirit (adapt; same language as the user):',
    '  "Got it — software engineering school, homework deadlines, and distractions.',
    '   I can help you get organized around focused study and hitting those dates.',
    '   We can start with a simple weekly focus rhythm — want to lock that in?"',
    'When it fits naturally (once, not every turn), you MAY name Watchtower lightly as',
    'the thing that will keep watching that focus for them — e.g. "That can become a',
    'Watchtower so we keep an eye on your study focus." Prefer plain language first;',
    'do not dump product jargon.',
    '=== END HELP COMMITMENT ===',
    '',
    'What to learn — gather naturally, one question at a time:',
    'MUST (required before the checkpoint):',
    '0. Focus axis (ASSUME professional by default — do NOT ask them to pick):',
    '   Default to a PROFESSIONAL focus. Do NOT ask personal-vs-professional.',
    '   Only switch to personal if the user EXPLICITLY asks (e.g. personal life,',
    '   studies as personal, family). Otherwise stay professional.',
    '   Treat that assumed (or explicitly requested) axis as the focus for this pass.',
    '1. Current context: what they do today (work, study, life situation, or mix) — CONCRETE.',
    '2. Aspiration / goal OR concrete struggle they want help with — CONCRETE direction.',
    'SHOULD (at most ONE if a turn remains; never block the checkpoint):',
    '3. Strengths OR active focus OR the main blocker — whichever fits naturally.',
    '',
    'IMPORTANT: Keep this first pass short. Aim for 3–4 user turns, then PROFILE CHECKPOINT.',
    'Do not interrogate. Prefer committing to help over digging for perfect answers.',
    '',
    'Stay on topic:',
    '- If the user drifts into small talk, acknowledge briefly and steer back to what',
    '  you are helping them organize.',
    '- If they name a fear, blocker, or distraction, treat it as useful signal — commit',
    '  to helping with it rather than chasing endless clarification.',
    '',
    'Use the USER PROFILE and USER BACKGROUND SUMMARY blocks when present.',
    'Reuse facts they shared; do not ask again for information already captured.',
    '',
    'Continuity:',
    '- If they return after a gap, briefly acknowledge what you already know and continue',
    '  helping — do not restart from zero.',
    '- During the first pass, do not offer pause-vs-continue mid-flow except at the',
    '  PROFILE CHECKPOINT when the stop condition is met.',
    '',
    'USER-FACING LANGUAGE:',
    'Prefer plain human language. You MAY say Watchtower once when introducing how you',
    'will keep watching a focus area. Avoid stacking jargon (Intent Profile, Discovery,',
    'Energeia) in chat. Internal words like "first-pass" are for you only.',
    '',
    'STOP AND CHECKPOINT once focus axis + concrete context + (goal OR struggle) are',
    'clear enough (prefer by ~3–4 user turns). When in doubt, checkpoint rather than ask',
    'again — unless a guard below applies.',
    'Once offering the checkpoint: do NOT ask another profile question.',
    '',
    'Context + specificity guard (before a hard checkpoint):',
    'You need (0) focus axis, (1) concrete current context, and (2) a concrete goal OR',
    'struggle. If any is missing or only vague, ask ONE clarifying question, then',
    'checkpoint next turn. Default is to checkpoint and commit to help.',
    '',
    'PROFILE CHECKPOINT (when the stop condition is met — first time only):',
    '- Summarize what you understood in 2–3 short sentences (include the struggle/goal).',
    '- Explicitly say you can start helping them get organized on that.',
    '- Then offer pause vs continue, in this spirit:',
    '  "I already have enough to start helping you get organized around [their focus].',
    '   You can pause and look at what I put together — or we keep talking and I refine it."',
    '- Same language as the user. Do NOT claim systems are already fully set up.',
    '- Do NOT quote button labels.',
    '',
    'AFTER the checkpoint (user keeps talking):',
    '- Enrichment mode: help them, do not restart the questionnaire.',
    '- Give concrete organizing help (one clear next step or a tiny plan skeleton).',
    '- Ask at most one question when it unblocks action — never a survey loop.',
    '',
    'RETURNING USER INTENTS (when the user clearly chooses one at the start):',
    '- Refine: deepen what you know — one clarifying question, then keep helping.',
    '- New Watchtower: learn the NEW area to watch; commit to setting that focus up.',
    '- Advance: one concrete next step on what is already in motion.',
    '',
    'ANTI-PATTERNS (never do these):',
    '- Do NOT open most turns with "That makes sense", "I hear you", "Perfect", or',
    '  similar fillers. Vary openings; often lead with the help commitment.',
    '- Do NOT only mirror their words and ask another open diagnostic question.',
    '- Do NOT keep asking what is getting in the way after they already named it.',
    '- Do NOT sound like a passive coach who never offers to organize their life.',
    '',
    'Style for live voice/chat:',
    '- Match the length and energy of the user. Brief input → brief reply.',
    '- Use the same language as the user.',
    '- One question at a time when you still need a MUST field.',
    '- Be human, warm, direct — a guide who helps organize, not a motivational speaker.',
    '- Do not use bullet lists or markdown in voice replies.',
  ].join('\n');

const VOICE_MODE_PROMPT = [
  '',
  '=== VOICE MODE ===',
  'You are in a live voice conversation. Speak like a calm, natural human.',
  'Help-commitment rules still apply — do not become a pure question machine.',
  '',
  'Length (default):',
  '- Greetings, thanks, confirmations, small talk: 1 short sentence.',
  '- Normal turns: 1–3 short sentences (commit to help + optional one question).',
  '- Checkpoint / help-commit turns: up to 3–4 sentences.',
  '- Never stack multiple tips or pep talks in one turn.',
  '',
  'Tone:',
  '- If the user spoke briefly, reply briefly.',
  '- Validate in a few words at most — then commit to helping or ask one needed question.',
  '- Never open consecutive turns with the same filler ("That makes sense", "I hear you").',
  '',
  'Format:',
  '- No lists, bullet points, or markdown.',
  '- Sound natural when spoken aloud. Avoid abbreviations and symbols.',
  '- One question at a time when gathering MUST fields.',
  '=== END VOICE MODE ===',
].join('\n');

const prisma = new PrismaClient();
const profilesRepo = createProfilesRepo(prisma);
const portfolioRepo = createPortfolioRepo(prisma);

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
  created_at: Date | null;
  updated_at: Date | null;
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
type DetectedProfileItem = {
  title: string;
  confidence: number;
};
type ProfilesExtractionPayload = {
  confirmed: boolean;
  profiles: DetectedProfileItem[];
};
type WatchtowerCoverageType = 'personal' | 'professional';
type WatchtowerIntentSpec = {
  topic: string;
  intent_summary: string;
  signals_of_interest: string[];
  suggested_sources: string[];
  suggested_frequency: string;
  suggested_reminder_time: string;
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

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

function isValidObjectId(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function serializeProfile(profile: import('./generated/prisma').Profile) {
  return {
    id: profile.id,
    user_id: profile.user_id,
    title: profile.title,
    context: profile.context,
    confidence: profile.confidence,
    is_primary: profile.is_primary,
    source: profile.source,
    created_at: profile.created_at.toISOString(),
    updated_at: profile.updated_at.toISOString(),
  };
}

function sendProfilesRouteError(
  res: import('express').Response,
  error: unknown,
  routeLabel: string,
): import('express').Response {
  if (error instanceof ProfileConflictError) {
    return res.status(409).json({ error: error.message });
  }
  if (error instanceof ProfileNotFoundError) {
    return res.status(404).json({ error: error.message });
  }
  if (error instanceof ProfileValidationError) {
    return res.status(400).json({ error: error.message });
  }
  console.error(`${routeLabel} error:`, error);
  return res.status(500).json({ error: 'Internal server error.' });
}

function serializePortfolioItem(item: import('./generated/prisma').PortfolioItem) {
  return {
    id: item.id,
    user_id: item.user_id,
    title: item.title,
    description: item.description,
    contribution: item.contribution,
    links: item.links,
    profile_ids: item.profile_ids,
    created_at: item.created_at.toISOString(),
    updated_at: item.updated_at.toISOString(),
  };
}

function sendPortfolioRouteError(
  res: import('express').Response,
  error: unknown,
  routeLabel: string,
): import('express').Response {
  if (error instanceof PortfolioNotFoundError) {
    return res.status(404).json({ error: error.message });
  }
  if (error instanceof PortfolioValidationError) {
    return res.status(400).json({ error: error.message });
  }
  console.error(`${routeLabel} error:`, error);
  return res.status(500).json({ error: 'Internal server error.' });
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
      'Open as a personal copilot who helps people get organized around what matters.',
      'Keep it human and about the user.',
      'Do NOT dump product jargon (Intent Profile, Discovery). Watchtower is fine once later,',
      'not in the opening.',
      "Use this style (adapt slightly to the user's language; keep the same length, tone, and intent):",
      "\"Hi, I'm Dynamis, your personal copilot. I'm here to understand what matters in",
      'your work and help you get organized toward it. What are you working on these days?"',
      'Keep it short: two short sentences. Do NOT ask personal vs professional.',
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

/**
 * Escalating checkpoint pressure for the first-pass profile conversation.
 * Soft preference around the 3rd user turn; hard checkpoint by the 4th.
 * From the 5th turn onward: enrichment (no more close pressure).
 * Gate on conversation (essentials the agent can infer) — NOT on async DB fields.
 */
function buildClosingPressureSystemBlock(userTurnCount: number): string {
  if (userTurnCount >= 5) {
    return [
      '=== ENRICHMENT MODE ===',
      'The first-pass profile window has passed. Do NOT restart the questionnaire.',
      'Do NOT re-offer the profile checkpoint unless the user asks what you have so far.',
      'HELP them get organized: one concrete next step or a tiny plan skeleton.',
      'If they ask for help, commit clearly — do not answer with only another question.',
      'Ask at most one thoughtful question when it unblocks action. Same language as the user.',
      '=== END ENRICHMENT MODE ===',
    ].join('\n');
  }
  if (userTurnCount >= 4) {
    return [
      '=== HARD CHECKPOINT ===',
      'This is at least the 4th user turn. Default: do NOT ask another profile question.',
      'Offer the PROFILE CHECKPOINT now:',
      '- Summarize what you understood in 2–3 short sentences (include struggle/goal).',
      '- Explicitly commit to helping them get organized on that focus.',
      '- Offer pause-and-look vs keep-talking.',
      '  Do not quote button labels. Do not claim systems are fully set up.',
      '- Same language as the user.',
      'EXCEPTION (only if genuinely needed): if focus axis, concrete context, OR a concrete',
      'goal/struggle is still missing, ask ONE final clarifying question — then checkpoint next.',
      'Do NOT use the exception to prolong interrogation.',
      '=== END HARD CHECKPOINT ===',
    ].join('\n');
  }
  if (userTurnCount >= 3) {
    return [
      '=== SOFT CHECKPOINT ===',
      'Prefer offering the PROFILE CHECKPOINT this turn if focus axis + context +',
      '(goal OR struggle) are covered with enough specificity.',
      'If an essential is missing or only vague, ask ONE clarifying question.',
      'If essentials are solid: commit to helping them organize that focus, then checkpoint',
      '(summarize + pause-vs-continue) — or one high-value follow-up then checkpoint next.',
      'Do NOT only validate and ask another open diagnostic question.',
      'Same language as the user.',
      '=== END SOFT CHECKPOINT ===',
    ].join('\n');
  }
  return '';
}

function buildSessionOpenSystemBlock(isFirstEver: boolean): string {
  if (isFirstEver) {
    return buildIntroductionSystemBlock(true);
  }
  return [
    '=== SESSION OPEN RULE ===',
    'The user just joined the voice session and has NOT spoken yet. YOU speak first.',
    'Greet them briefly as a returning conversation — warm, direct, no self-introduction.',
    'If you know prior context from profile/summary/history, acknowledge it in one short clause',
    'and invite them to continue. Do not dump a long recap.',
    'Keep it to 1–2 short spoken sentences, then wait for them.',
    'Do NOT mention Watchtowers, Intent Profiles, Discovery, or internal product jargon.',
    '=== END SESSION OPEN RULE ===',
  ].join('\n');
}

async function persistAgentMessage(
  userId: string,
  sessionId: string,
  aiResponse: string,
): Promise<void> {
  await prisma.chatHistory.create({
    data: {
      user_id: userId,
      session_id: sessionId,
      sender: 'agent',
      message: aiResponse,
      created_at: new Date(),
    },
  });
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
    created_at: (row.created_at as Date | null) ?? null,
    updated_at: (row.updated_at as Date | null) ?? null,
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

const WATCHTOWER_MAX_RECOMMENDATIONS = 1;
const WATCHTOWER_MAX_TOKENS = 900;

const WATCHTOWER_RECOMMENDATIONS_SYSTEM_PROMPT = [
  'You generate ONE Watchtower recommendation for Dynamis / Unlock.',
  "A Watchtower is a recurring area the system will monitor on the user's behalf,",
  'with a clear objective, a check-in cadence, and a suggested reminder time.',
  "Given the user's intent profile, produce exactly ONE personalized watchtower.",
  '',
  'Coverage rules:',
  "- coverage_type must match the user's stated focus when possible.",
  '- If the profile clearly leans personal (life outside work, values, health, relationships,',
  '  personal projects), use "personal".',
  '- If it clearly leans career/work/study/professional growth, use "professional".',
  '- If mixed or unclear, prefer the stronger aspiration signal; default to "professional".',
  '- NEVER invent facts, relationships, hobbies, health conditions, or life events the profile does not contain.',
  '',
  'Each recommendation must be explicitly grounded in something specific from the profile.',
  'user_facing_description should explain the Watchtower objectives in warm, plain language',
  '(2–4 sentences), referencing profile evidence naturally.',
  'display_name must be personalized (e.g. "Your fundraising landscape"), never generic.',
  'suggested_sources may be an empty array.',
  'suggested_frequency examples: "weekly", "biweekly", "daily".',
  'suggested_reminder_time must be a 24h HH:MM string (e.g. "09:00") that fits the cadence.',
  'evidence_basis must name which profile fields drove the recommendation.',
  'Output ONLY valid JSON, no markdown, no preamble, exact shape:',
  '{"recommendations":[',
  '{"coverage_type":"professional","display_name":"...","user_facing_description":"...","watchtower_intent_spec":{"topic":"...","intent_summary":"...","signals_of_interest":["..."],"suggested_sources":["..."],"suggested_frequency":"weekly","suggested_reminder_time":"09:00","evidence_basis":"...","rationale":"..."}}',
  ']}',
  "coverage_type must be exactly 'personal' or 'professional'.",
  'Emit exactly one item in recommendations.',
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

function parseWatchtowerReminderTime(raw: unknown): string {
  const value = String(raw ?? '').trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return value;
  }
  return '09:00';
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
    suggested_reminder_time: parseWatchtowerReminderTime(record.suggested_reminder_time),
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

async function buildReturnConversationTopic(userId: string): Promise<string | null> {
  const rows = await prisma.chatHistory.findMany({
    where: { user_id: userId },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: 16,
  });

  if (rows.length === 0) {
    return null;
  }

  const chronological = [...rows].reverse();
  const transcript = chronological
    .map((row) => {
      const role = String(row.sender) === 'user' ? 'User' : 'Guide';
      const clean = String(row.message ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 280);
      return `${role}: ${clean}`;
    })
    .filter((line) => line.length > 8)
    .join('\n');

  if (!transcript) {
    return null;
  }

  try {
    const res = await anthropic.messages.create({
      model: SUMMARY_MODEL,
      system: [
        'Summarize what the user and guide last talked about.',
        'Return ONE short phrase in the same language as the transcript (3–12 words).',
        'No quotes, no trailing punctuation, no full sentences if a phrase works.',
        'Ground the phrase only in the transcript.',
      ].join(' '),
      max_tokens: 60,
      messages: [
        {
          role: 'user',
          content: `Recent transcript:\n${transcript}\n\nPhrase only:`,
        },
      ],
    });
    const block = res.content[0];
    if (!block || block.type !== 'text') {
      return null;
    }
    const topic = block.text.replace(/^["'\s]+|["'\s.!?]+$/g, '').trim();
    return topic.length > 0 ? topic.slice(0, 120) : null;
  } catch (error) {
    console.error('[profile] return_topic_failed', { user_id: userId, error });
    return null;
  }
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

const PROFILE_CREATION_CONFIRM_RE =
  /\b(sim|yes|yeah|yep|ok|okay|pode|cria|criar|quero|isso|confirmo|confirma|claro|please|go\s*ahead|pode\s*criar|cria\s*a[ií]|faz\s*isso|let'?s\s*go)\b/i;

function hasProfileCreationConfirmationSignal(latestUserMessage: string): boolean {
  const text = latestUserMessage.replace(/\s+/g, ' ').trim();
  if (!text) return false;
  return PROFILE_CREATION_CONFIRM_RE.test(text);
}

function pickDetectedProfiles(raw: unknown): DetectedProfileItem[] {
  if (!Array.isArray(raw)) return [];
  const out: DetectedProfileItem[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as { title?: unknown; confidence?: unknown };
    const title = pickProfileString(record.title);
    if (!title) continue;
    const confidenceRaw =
      typeof record.confidence === 'number' ? record.confidence : Number(record.confidence);
    if (!Number.isFinite(confidenceRaw)) continue;
    const confidence = Math.max(0, Math.min(100, Math.trunc(confidenceRaw)));
    out.push({ title: title.slice(0, 120), confidence });
  }
  return out;
}

async function extractProfilesFromConversation(
  userId: string,
): Promise<ProfilesExtractionPayload | null> {
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

  const extractorSystem = [
    'You analyze a conversation between a user and Dynamis (an AI career copilot).',
    'Decide TWO things from CLEAR evidence only:',
    '(a) Did the user EXPLICITLY confirm they want professional profiles created',
    '    (e.g. agreeing to set up separate tracks/sides the agent proposed)?',
    '(b) Which distinct professional contexts were clearly described',
    '    (concrete role titles + confidence 0-100)?',
    '',
    'HARD RULES:',
    '- Never invent a context the user did not clearly describe.',
    '- If there is NO explicit confirmation to create profiles, return confirmed:false',
    '  and profiles:[].',
    '- Titles must be concrete professional roles (e.g. "Software Engineer",',
    '  "Software Architect"), not vague labels.',
    '- Confidence is an integer 0-100 reflecting how clearly that role appeared.',
    '',
    'Respond ONLY with a single JSON object using these exact keys:',
    '{',
    '  "confirmed": boolean,',
    '  "profiles": [{"title": string, "confidence": number}]',
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
        content: `RECENT TRANSCRIPT:\n${transcript}\n\nReturn the JSON now.`,
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
    console.warn('[profiles] extraction returned no json', {
      user_id: userId,
      sample: raw.slice(0, 200),
    });
    return null;
  }
  try {
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
      confirmed?: unknown;
      profiles?: unknown;
    };
    return {
      confirmed: parsed.confirmed === true,
      profiles: pickDetectedProfiles(parsed.profiles),
    };
  } catch (err) {
    console.warn('[profiles] extraction json parse failed', {
      user_id: userId,
      error: String(err),
    });
    return null;
  }
}

async function persistDetectedProfiles(
  userId: string,
  profiles: DetectedProfileItem[],
): Promise<string[]> {
  const createdTitles: string[] = [];
  for (const item of profiles) {
    try {
      const created = await profilesRepo.createProfile({
        user_id: userId,
        title: item.title,
        confidence: item.confidence,
        source: 'agent',
      });
      createdTitles.push(created.title);
    } catch (error) {
      if (error instanceof ProfileConflictError) {
        console.log('[profiles] skip_duplicate_title', {
          user_id: userId,
          title: item.title,
        });
        continue;
      }
      throw error;
    }
  }
  return createdTitles;
}

async function maybeCreateProfilesFromConversation(userId: string): Promise<void> {
  const startedAt = Date.now();
  const latest = await prisma.chatHistory.findFirst({
    where: { user_id: userId, sender: 'user' },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    select: { message: true },
  });
  const latestMessage = String(latest?.message ?? '');
  if (!hasProfileCreationConfirmationSignal(latestMessage)) {
    console.log('[profiles] skipped', { user_id: userId, reason: 'no_confirm_signal' });
    return;
  }

  const extracted = await extractProfilesFromConversation(userId);
  if (!extracted) {
    console.log('[profiles] skipped', { user_id: userId, reason: 'no_extraction' });
    return;
  }
  if (!extracted.confirmed || extracted.profiles.length === 0) {
    console.log('[profiles] skipped', {
      user_id: userId,
      reason: 'not_confirmed_or_empty',
      confirmed: extracted.confirmed,
      elapsed_ms: Date.now() - startedAt,
    });
    return;
  }

  const titles = await persistDetectedProfiles(userId, extracted.profiles);
  if (titles.length === 0) {
    console.log('[profiles] no_creates', {
      user_id: userId,
      elapsed_ms: Date.now() - startedAt,
    });
    return;
  }

  console.log('[profiles] created', {
    user_id: userId,
    titles,
    elapsed_ms: Date.now() - startedAt,
  });
}

function enqueueProfileUpdate(userId: string): void {
  void (async () => {
    const startedAt = Date.now();
    try {
      const current = await loadUserProfile(userId);
      const extracted = await extractProfileFromConversation(userId, current);
      if (!extracted) {
        console.log('[profile] skipped', { user_id: userId, reason: 'no_extraction' });
      } else {
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
      }
    } catch (err) {
      console.error('[profile] update_failed', { user_id: userId, error: String(err) });
    }

    try {
      await maybeCreateProfilesFromConversation(userId);
    } catch (err) {
      console.error('[profiles] create_failed', { user_id: userId, error: String(err) });
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

  const userTurnCount = prior.filter((m) => m.role === 'user').length + 1;
  const closingInstruction = buildClosingPressureSystemBlock(userTurnCount);
  if (closingInstruction) {
    systemBlocks.push({ type: 'text', text: closingInstruction });
  }

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
    sessionKickoff?: boolean;
  } = {},
): Promise<VoiceStreamResult> {
  const turnStartedAt = Date.now();
  const messageLimit = VOICE_RECENT_MESSAGE_LIMIT;
  const maxTokens = VOICE_MAX_TOKENS;
  const isSessionKickoff = opts.sessionKickoff === true;

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

  const turnInstruction = isSessionKickoff
    ? buildSessionOpenSystemBlock(firstEver)
    : buildIntroductionSystemBlock(
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
  systemBlocks.push({ type: 'text', text: turnInstruction });

  // Same turn-based checkpoint pressure as text chat (skip session kickoff).
  if (!isSessionKickoff) {
    const userTurnCount = prior.filter((m) => m.role === 'user').length + 1;
    const closingInstruction = buildClosingPressureSystemBlock(userTurnCount);
    if (closingInstruction) {
      systemBlocks.push({ type: 'text', text: closingInstruction });
    }
  }

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
  messages.push({
    role: 'user',
    content: isSessionKickoff ? VOICE_SESSION_OPEN_USER_MESSAGE : userMessage,
  });

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
      if (isSessionKickoff) {
        await persistAgentMessage(userId, sessionId, finalReply);
      } else {
        await persistTurn(userId, sessionId, userMessage, finalReply);
      }
    } catch (e) {
      console.error('[persist] failed', e);
    }
    if (PROFILE_UPDATE_ON_VOICE && !isSessionKickoff) {
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

const TTS_ONE_SHOT_MAX_CHARS = Number(process.env.TTS_ONE_SHOT_MAX_CHARS ?? 500);

app.post('/tts', async (req: import('express').Request, res: import('express').Response) => {
  try {
    if (!isRequestAuthorized(req)) {
      return res.status(401).json({ error: 'Acesso não autorizado' });
    }

    const text = String(req.body?.text ?? '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Invalid or missing text.' });
    }
    if (text.length > TTS_ONE_SHOT_MAX_CHARS) {
      return res.status(400).json({
        error: `text too long (max ${TTS_ONE_SHOT_MAX_CHARS} chars).`,
      });
    }

    const audio = await synthesizeSpeech(text, { tag: 'one_shot' });
    if (!audio) {
      return res.status(503).json({ error: 'TTS unavailable.' });
    }

    return res.status(200).json({
      audio_base64: audio.audioBase64,
      mime_type: audio.mimeType,
    });
  } catch (error) {
    console.error('POST /tts error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

async function handleLookupProfileByEmail(
  req: import('express').Request,
  res: import('express').Response,
): Promise<import('express').Response> {
  try {
    if (!isRequestAuthorized(req)) {
      return res.status(401).json({ error: 'Acesso não autorizado' });
    }

    const rawEmail = req.method === 'POST' ? req.body?.email : req.query.email;
    const email = String(Array.isArray(rawEmail) ? (rawEmail[0] ?? '') : (rawEmail ?? ''))
      .trim()
      .toLowerCase();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid or missing email.',
      });
    }

    const row = await prisma.userProfile.findFirst({
      where: { email },
    });

    if (!row) {
      console.log('[profile] by_email', { email, found: false });
      return res.status(200).json({ profile: null });
    }

    console.log('[profile] by_email', { email, user_id: row.user_id, found: true });
    return res.status(200).json({
      profile: {
        user_id: String(row.user_id),
        email: (row.email as string | null) ?? email,
        display_name: (row.display_name as string | null) ?? null,
      },
    });
  } catch (error) {
    console.error('[profile] by_email error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

// Prefer this path — never conflicts with GET /profile/:userId.
app.post('/auth/lookup-by-email', handleLookupProfileByEmail);
app.get('/auth/lookup-by-email', handleLookupProfileByEmail);
// Legacy alias (must stay above /profile/:userId).
app.get('/profile/by-email', handleLookupProfileByEmail);

app.get('/profiles', async (req: import('express').Request, res: import('express').Response) => {
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

    const profiles = await profilesRepo.listProfiles(userId);
    return res.status(200).json({
      profiles: profiles.map(serializeProfile),
    });
  } catch (error) {
    return sendProfilesRouteError(res, error, 'GET /profiles');
  }
});

app.post('/profiles', async (req: import('express').Request, res: import('express').Response) => {
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

    const title = String(req.body?.title ?? '').trim();
    const source = String(req.body?.source ?? '').trim();
    const confidenceRaw = req.body?.confidence;
    const confidence = typeof confidenceRaw === 'number' ? confidenceRaw : Number(confidenceRaw);

    const hasContext = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'context');
    const profile = await profilesRepo.createProfile({
      user_id: userId,
      title,
      confidence,
      source,
      ...(hasContext ? { context: req.body.context } : {}),
    });

    console.log('[profiles] create', {
      user_id: userId,
      id: profile.id,
      is_primary: profile.is_primary,
    });
    return res.status(201).json({ profile: serializeProfile(profile) });
  } catch (error) {
    return sendProfilesRouteError(res, error, 'POST /profiles');
  }
});

app.patch(
  '/profiles/:id/primary',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const id = String(req.params.id ?? '').trim();
      if (!id || !isValidObjectId(id)) {
        return res.status(400).json({
          error: 'Invalid or missing id. Expected ObjectId.',
        });
      }

      const userId = String(req.body?.user_id ?? '').trim();
      if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({
          error: 'Invalid or missing user_id. Expected UUID.',
        });
      }

      const profile = await profilesRepo.setPrimaryProfile(id, userId);
      console.log('[profiles] set_primary', { user_id: userId, id: profile.id });
      return res.status(200).json({ profile: serializeProfile(profile) });
    } catch (error) {
      return sendProfilesRouteError(res, error, 'PATCH /profiles/:id/primary');
    }
  },
);

app.patch(
  '/profiles/:id',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const id = String(req.params.id ?? '').trim();
      if (!id || !isValidObjectId(id)) {
        return res.status(400).json({
          error: 'Invalid or missing id. Expected ObjectId.',
        });
      }

      const hasTitle = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'title');
      const hasContext = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'context');
      if (!hasTitle && !hasContext) {
        return res.status(400).json({
          error: 'No fields to update. Provide title and/or context.',
        });
      }

      const profile = await profilesRepo.updateProfile(id, {
        ...(hasTitle ? { title: String(req.body.title ?? '') } : {}),
        ...(hasContext ? { context: req.body.context } : {}),
      });

      console.log('[profiles] update', { id: profile.id });
      return res.status(200).json({ profile: serializeProfile(profile) });
    } catch (error) {
      return sendProfilesRouteError(res, error, 'PATCH /profiles/:id');
    }
  },
);

app.get('/portfolio', async (req: import('express').Request, res: import('express').Response) => {
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

    const profileIdRaw = String(req.query.profile_id ?? '').trim();
    if (profileIdRaw && !isValidObjectId(profileIdRaw)) {
      return res.status(400).json({
        error: 'Invalid profile_id. Expected ObjectId.',
      });
    }
    const profileId = profileIdRaw.length > 0 ? profileIdRaw : undefined;

    const items = await portfolioRepo.listPortfolioItems(userId, profileId);
    return res.status(200).json({
      items: items.map(serializePortfolioItem),
    });
  } catch (error) {
    return sendPortfolioRouteError(res, error, 'GET /portfolio');
  }
});

app.post('/portfolio', async (req: import('express').Request, res: import('express').Response) => {
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

    const body = req.body ?? {};
    const hasDescription = Object.prototype.hasOwnProperty.call(body, 'description');
    const hasContribution = Object.prototype.hasOwnProperty.call(body, 'contribution');
    const hasLinks = Object.prototype.hasOwnProperty.call(body, 'links');
    const hasProfileIds = Object.prototype.hasOwnProperty.call(body, 'profile_ids');

    const item = await portfolioRepo.createPortfolioItem({
      user_id: userId,
      title: String(body.title ?? ''),
      ...(hasDescription ? { description: body.description } : {}),
      ...(hasContribution ? { contribution: body.contribution } : {}),
      ...(hasLinks ? { links: body.links } : {}),
      ...(hasProfileIds ? { profile_ids: body.profile_ids } : {}),
    });

    console.log('[portfolio] create', { user_id: userId, id: item.id });
    return res.status(201).json({ item: serializePortfolioItem(item) });
  } catch (error) {
    return sendPortfolioRouteError(res, error, 'POST /portfolio');
  }
});

app.patch(
  '/portfolio/:id',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const id = String(req.params.id ?? '').trim();
      if (!id || !isValidObjectId(id)) {
        return res.status(400).json({
          error: 'Invalid or missing id. Expected ObjectId.',
        });
      }

      const body = req.body ?? {};
      const hasTitle = Object.prototype.hasOwnProperty.call(body, 'title');
      const hasDescription = Object.prototype.hasOwnProperty.call(body, 'description');
      const hasContribution = Object.prototype.hasOwnProperty.call(body, 'contribution');
      const hasLinks = Object.prototype.hasOwnProperty.call(body, 'links');
      const hasProfileIds = Object.prototype.hasOwnProperty.call(body, 'profile_ids');

      if (!hasTitle && !hasDescription && !hasContribution && !hasLinks && !hasProfileIds) {
        return res.status(400).json({
          error:
            'No fields to update. Provide title, description, contribution, links, and/or profile_ids.',
        });
      }

      const item = await portfolioRepo.updatePortfolioItem(id, {
        ...(hasTitle ? { title: String(body.title ?? '') } : {}),
        ...(hasDescription ? { description: body.description } : {}),
        ...(hasContribution ? { contribution: body.contribution } : {}),
        ...(hasLinks ? { links: body.links } : {}),
        ...(hasProfileIds ? { profile_ids: body.profile_ids } : {}),
      });

      console.log('[portfolio] update', { id: item.id });
      return res.status(200).json({ item: serializePortfolioItem(item) });
    } catch (error) {
      return sendPortfolioRouteError(res, error, 'PATCH /portfolio/:id');
    }
  },
);

app.delete(
  '/portfolio/:id',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const id = String(req.params.id ?? '').trim();
      if (!id || !isValidObjectId(id)) {
        return res.status(400).json({
          error: 'Invalid or missing id. Expected ObjectId.',
        });
      }

      const userId = String(req.body?.user_id ?? req.query.user_id ?? '').trim();
      if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({
          error: 'Invalid or missing user_id. Expected UUID.',
        });
      }

      await portfolioRepo.deletePortfolioItem(id, userId);
      console.log('[portfolio] delete', { user_id: userId, id });
      return res.status(200).json({ ok: true });
    } catch (error) {
      return sendPortfolioRouteError(res, error, 'DELETE /portfolio/:id');
    }
  },
);

app.post(
  '/profile/email',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const userId = String(req.body?.user_id ?? '').trim();
      const email = String(req.body?.email ?? '')
        .trim()
        .toLowerCase();
      const displayNameRaw = String(req.body?.display_name ?? '').trim();
      const displayName = displayNameRaw.length > 0 ? displayNameRaw : null;

      if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({
          error: 'Invalid or missing user_id. Expected UUID.',
        });
      }
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({
          error: 'Invalid or missing email.',
        });
      }

      const now = new Date();
      await prisma.userProfile.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          email,
          display_name: displayName,
          values_list: [],
          created_at: now,
          updated_at: now,
        },
        update: {
          email,
          ...(displayName ? { display_name: displayName } : {}),
          updated_at: now,
        },
      });

      console.log('[profile] email_saved', { user_id: userId });
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('POST /profile/email error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

app.get(
  '/profile/:userId/return-context',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const userId = String(req.params.userId ?? '').trim();
      if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({
          error: 'Invalid or missing userId. Expected UUID.',
        });
      }

      const messageCount = await prisma.chatHistory.count({
        where: { user_id: userId },
      });

      if (messageCount === 0) {
        console.log('[profile] return_context', { user_id: userId, returning: false });
        return res.status(200).json({
          returning: false,
          last_topic: null,
        });
      }

      const profile = await loadUserProfile(userId);
      const topicFromProfile =
        pickProfileString(profile?.active_focus) ?? pickProfileString(profile?.aspirations);
      const lastTopic = (await buildReturnConversationTopic(userId)) ?? topicFromProfile;

      console.log('[profile] return_context', {
        user_id: userId,
        returning: true,
        has_topic: Boolean(lastTopic),
        message_count: messageCount,
      });

      return res.status(200).json({
        returning: true,
        last_topic: lastTopic,
      });
    } catch (error) {
      console.error('GET /profile/:userId/return-context error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

app.get(
  '/profile/:userId',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const userId = String(req.params.userId ?? '').trim();
      if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({
          error: 'Invalid or missing userId. Expected UUID.',
        });
      }

      const profile = await loadUserProfile(userId);
      if (!profile) {
        console.log('[profile] get', { user_id: userId, found: false });
        return res.status(200).json({ profile: null });
      }

      console.log('[profile] get', { user_id: userId, found: true });
      return res.status(200).json({
        profile: {
          user_id: profile.user_id,
          display_name: profile.display_name,
          role_context: profile.role_context,
          aspirations: profile.aspirations,
          strengths: profile.strengths,
          weaknesses: profile.weaknesses,
          values_list: profile.values_list,
          active_focus: profile.active_focus,
          notes: profile.notes,
          long_term_summary: profile.long_term_summary,
          long_term_summary_at: profile.long_term_summary_at
            ? profile.long_term_summary_at.toISOString()
            : null,
          long_term_summary_msg_count: profile.long_term_summary_msg_count,
          created_at: profile.created_at ? profile.created_at.toISOString() : null,
          updated_at: profile.updated_at ? profile.updated_at.toISOString() : null,
        },
      });
    } catch (error) {
      console.error('GET /profile/:userId error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

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

const CHAT_SESSIONS_SCAN_LIMIT = Number(process.env.CHAT_SESSIONS_SCAN_LIMIT ?? 800);
const CHAT_SESSIONS_LIST_LIMIT = Number(process.env.CHAT_SESSIONS_LIST_LIMIT ?? 40);

type ChatSessionSummary = {
  session_id: string;
  preview: string;
  message_count: number;
  started_at: string;
  updated_at: string;
};

function buildChatSessionSummaries(
  rows: { session_id: string; sender: string; message: string; created_at: Date }[],
): ChatSessionSummary[] {
  const bySession = new Map<
    string,
    {
      preview: string;
      message_count: number;
      started_at: Date;
      updated_at: Date;
      firstUserPreview: string | null;
    }
  >();

  for (const row of rows) {
    const trimmed = row.message.trim();
    const existing = bySession.get(row.session_id);
    if (!existing) {
      bySession.set(row.session_id, {
        preview: trimmed.slice(0, 140),
        message_count: 1,
        started_at: row.created_at,
        updated_at: row.created_at,
        firstUserPreview:
          row.sender === 'user' && trimmed && !trimmed.startsWith('[Voice session')
            ? trimmed.slice(0, 140)
            : null,
      });
      continue;
    }
    existing.message_count += 1;
    if (row.created_at < existing.started_at) {
      existing.started_at = row.created_at;
      if (!existing.firstUserPreview) {
        existing.preview = trimmed.slice(0, 140);
      }
    }
    if (row.created_at > existing.updated_at) {
      existing.updated_at = row.created_at;
    }
    if (
      !existing.firstUserPreview &&
      row.sender === 'user' &&
      trimmed &&
      !trimmed.startsWith('[Voice session')
    ) {
      existing.firstUserPreview = trimmed.slice(0, 140);
    }
  }

  return [...bySession.entries()]
    .map(([sessionId, value]) => ({
      session_id: sessionId,
      preview: value.firstUserPreview || value.preview || 'Conversation',
      message_count: value.message_count,
      started_at: value.started_at.toISOString(),
      updated_at: value.updated_at.toISOString(),
    }))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, CHAT_SESSIONS_LIST_LIMIT);
}

app.get(
  '/chat/sessions',
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

      const rows = await prisma.chatHistory.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: CHAT_SESSIONS_SCAN_LIMIT,
        select: {
          session_id: true,
          sender: true,
          message: true,
          created_at: true,
        },
      });

      // Chronological within scan window for preview logic.
      const chronological = [...rows].reverse();
      const sessions = buildChatSessionSummaries(chronological);
      return res.status(200).json({ sessions });
    } catch (error) {
      console.error('GET /chat/sessions error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

app.get(
  '/chat/sessions/:sessionId',
  async (req: import('express').Request, res: import('express').Response) => {
    try {
      if (!isRequestAuthorized(req)) {
        return res.status(401).json({ error: 'Acesso não autorizado' });
      }

      const userId = String(req.query.user_id ?? '').trim();
      const sessionId = String(req.params.sessionId ?? '').trim();
      if (!userId || !isValidUuid(userId)) {
        return res.status(400).json({
          error: 'Invalid or missing user_id. Expected UUID.',
        });
      }
      if (!sessionId || !isValidUuid(sessionId)) {
        return res.status(400).json({
          error: 'Invalid or missing sessionId. Expected UUID.',
        });
      }

      const rows = await prisma.chatHistory.findMany({
        where: { user_id: userId, session_id: sessionId },
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          sender: true,
          message: true,
          created_at: true,
        },
      });

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Session not found.' });
      }

      return res.status(200).json({
        session_id: sessionId,
        messages: rows.map((row) => ({
          id: row.id,
          role: row.sender === 'user' ? 'user' : 'agent',
          text: row.message,
          created_at: row.created_at.toISOString(),
        })),
      });
    } catch (error) {
      console.error('GET /chat/sessions/:sessionId error:', error);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

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

    const envFloorRaw = process.env.ASSEMBLYAI_MAX_TURN_SILENCE_MS ?? '2800';
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
      turnOpts: { sessionKickoff?: boolean } = {},
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
            sessionKickoff: turnOpts.sessionKickoff === true,
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

    const enqueueResponse = (transcript: string, turnOpts: { sessionKickoff?: boolean } = {}) => {
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
            await runStreamingTurn(transcript, controller.signal, capturedInterrupted, turnOpts);
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

    if (VOICE_AGENT_OPENS && context.mode === 'full') {
      console.log('[voice] session_open_kickoff', {
        session_id: context.sessionId,
        user_id: context.userId,
      });
      enqueueResponse(VOICE_SESSION_OPEN_USER_MESSAGE, { sessionKickoff: true });
    }

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

const { randomUUID, timingSafeEqual } = require('node:crypto') as typeof import('node:crypto');
const { createServer } = require('node:http') as typeof import('node:http');
const express = require('express') as typeof import('express');
const cors = require('cors') as typeof import('cors');
const { Pool } = require('pg') as typeof import('pg');
const Anthropic = require('@anthropic-ai/sdk')
  .default as typeof import('@anthropic-ai/sdk').default;
const { WebSocket, WebSocketServer } = require('ws') as typeof import('ws');
const dotenv = require('dotenv') as typeof import('dotenv');

dotenv.config();

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT ?? 8080);
const RECENT_MESSAGE_LIMIT = Number(process.env.RECENT_MESSAGE_LIMIT ?? 20);
const VOICE_RECENT_MESSAGE_LIMIT = Number(process.env.VOICE_RECENT_MESSAGE_LIMIT ?? 8);
const RESPONSE_MAX_TOKENS = Number(process.env.RESPONSE_MAX_TOKENS ?? 700);
const VOICE_MAX_TOKENS = Number(process.env.VOICE_MAX_TOKENS ?? 700);
const VOICE_SAMPLE_RATE = Number(process.env.VOICE_SAMPLE_RATE ?? 16000);
const VOICE_PATH = '/voice/realtime';
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
    'You are Dynamis, a personal career copilot for the AI era.',
    'Mission: help the user thrive alongside AI agents (not be replaced by them).',
    '',
    'Always pursue these goals during the conversation, naturally:',
    '1. Listen and let the user vent. Show empathy and validate feelings before advising.',
    '2. Build a living understanding of WHO the user is: profession, skills, strengths,',
    '   weaknesses, current job context, ambitions, fears, recent wins, recent struggles.',
    '3. Identify concrete ways the user can pair with AI agents to amplify their work',
    '   (delegation, automation, augmentation), instead of competing with them.',
    '4. Suggest small, doable next steps (one experiment, one skill, one tool) per turn,',
    '   tailored to the user profile you have learned so far.',
    '5. Remember relevant facts the user shares and reuse them in future turns.',
    '',
    'Style for live voice/chat:',
    '- Concise, high-value responses.',
    '- Be concise by default, but complete.',
    '- For simple questions: short answers. For complex/emotional moments: expand when useful.',
    '- Avoid unnecessary verbosity, but do not cut off important reasoning.',
    '- Use the same language as the user.',
    '- One question at a time when you need more information.',
    '- Prefer practical, specific guidance over generic advice.',
    '- Be human, warm, direct, and supportive.',
  ].join('\n');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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
type VoiceSessionContext = {
  userId: string;
  sessionId: string;
  sampleRate: number;
  endpointingMs?: number;
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
  const res = await db.query<{ sender: string; message: string }>(
    `SELECT sender, message
     FROM chat_history
     WHERE user_id = $1::uuid AND session_id = $2::uuid
     ORDER BY created_at ASC, id ASC
     LIMIT $3`,
    [userId, sessionId, limit],
  );

  const out: ChatMessage[] = [];
  for (const row of res.rows) {
    if (row.sender === 'user') {
      out.push({ role: 'user', content: row.message });
    } else if (row.sender === 'agent') {
      out.push({ role: 'assistant', content: row.message });
    }
  }
  return out;
}

/**
 * Checks whether this user has ever received an agent reply before.
 * Used to trigger a one-time self-introduction in the very first reply.
 */
async function isFirstEverInteraction(userId: string): Promise<boolean> {
  const res = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM chat_history
       WHERE user_id = $1::uuid AND sender = 'agent'
       LIMIT 1
     ) AS exists`,
    [userId],
  );
  return res.rows[0]?.exists === false;
}

async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  const res = await db.query<{
    user_id: string;
    display_name: string | null;
    role_context: string | null;
    aspirations: string | null;
    strengths: string | null;
    weaknesses: string | null;
    values_list: unknown;
    active_focus: string | null;
    notes: string | null;
    long_term_summary: string | null;
    long_term_summary_at: Date | null;
    long_term_summary_msg_count: number | null;
  }>(
    `SELECT user_id, display_name, role_context, aspirations, strengths, weaknesses,
            values_list, active_focus, notes, long_term_summary, long_term_summary_at,
            long_term_summary_msg_count
     FROM user_profiles WHERE user_id = $1::uuid`,
    [userId],
  );
  const row = res.rows[0];
  if (!row) {
    return null;
  }
  let values: string[] = [];
  if (Array.isArray(row.values_list)) {
    values = (row.values_list as unknown[]).filter((v): v is string => typeof v === 'string');
  }
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    role_context: row.role_context,
    aspirations: row.aspirations,
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    values_list: values,
    active_focus: row.active_focus,
    notes: row.notes,
    long_term_summary: row.long_term_summary,
    long_term_summary_at: row.long_term_summary_at,
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

async function countCrossSessionMessages(
  userId: string,
  excludeSessionId: string,
): Promise<number> {
  const res = await db.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM chat_history
     WHERE user_id = $1::uuid AND session_id <> $2::uuid`,
    [userId, excludeSessionId],
  );
  return Number(res.rows[0]?.total ?? 0);
}

async function fetchCrossSessionMessages(
  userId: string,
  excludeSessionId: string,
  limit: number,
): Promise<{ sender: string; message: string }[]> {
  const res = await db.query<{ sender: string; message: string }>(
    `SELECT sender, message
     FROM (
       SELECT sender, message, created_at, id
       FROM chat_history
       WHERE user_id = $1::uuid AND session_id <> $2::uuid
       ORDER BY created_at DESC, id DESC
       LIMIT $3
     ) t
     ORDER BY created_at ASC, id ASC`,
    [userId, excludeSessionId, limit],
  );
  return res.rows;
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
    await db.query(
      `INSERT INTO user_profiles (user_id, long_term_summary, long_term_summary_at, long_term_summary_msg_count, updated_at)
       VALUES ($1::uuid, $2, NOW(), $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         long_term_summary = EXCLUDED.long_term_summary,
         long_term_summary_at = EXCLUDED.long_term_summary_at,
         long_term_summary_msg_count = EXCLUDED.long_term_summary_msg_count,
         updated_at = NOW()`,
      [userId, summary, totalMessages],
    );
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
  const recentRes = await db.query<{ sender: string; message: string }>(
    `SELECT sender, message
     FROM (
       SELECT sender, message, created_at, id
       FROM chat_history
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC, id DESC
       LIMIT $2
     ) t
     ORDER BY created_at ASC, id ASC`,
    [userId, PROFILE_EXTRACTION_MESSAGE_LIMIT],
  );
  if (recentRes.rowCount === 0) {
    return null;
  }
  const transcript = recentRes.rows
    .map((r) => {
      const role = r.sender === 'user' ? 'User' : 'Dynamis';
      const clean = r.message.replace(/\s+/g, ' ').trim();
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

  await db.query(
    `INSERT INTO user_profiles (user_id, display_name, role_context, aspirations, strengths, weaknesses,
       values_list, active_focus, notes, updated_at)
     VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       role_context = EXCLUDED.role_context,
       aspirations = EXCLUDED.aspirations,
       strengths = EXCLUDED.strengths,
       weaknesses = EXCLUDED.weaknesses,
       values_list = EXCLUDED.values_list,
       active_focus = EXCLUDED.active_focus,
       notes = EXCLUDED.notes,
       updated_at = NOW()`,
    [
      userId,
      next.display_name,
      next.role_context,
      next.aspirations,
      next.strengths,
      next.weaknesses,
      JSON.stringify(next.values_list ?? []),
      next.active_focus,
      next.notes,
    ],
  );
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
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO chat_history (user_id, session_id, sender, message)
       VALUES ($1::uuid, $2::uuid, 'user', $3)`,
      [userId, sessionId, userMessage],
    );
    await client.query(
      `INSERT INTO chat_history (user_id, session_id, sender, message)
       VALUES ($1::uuid, $2::uuid, 'agent', $3)`,
      [userId, sessionId, aiResponse],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runAgentTurn(
  userId: string,
  sessionId: string,
  userMessage: string,
  opts: { voice?: boolean } = {},
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
    stableParts.push(
      [
        '',
        '=== VOICE MODE ===',
        'You are responding to a live voice conversation. Extra rules:',
        '- Keep answers concise by default, but complete.',
        '- For simple turns: short reply. For complex turns: expand as needed.',
        '- Always finish your thought. Do not truncate important context.',
        '- No lists, no bullet points, no markdown.',
        '- Sound natural when spoken aloud. Avoid abbreviations and symbols.',
        '- End with a short question or action only when it truly fits. Never force it.',
        '=== END VOICE MODE ===',
      ].join('\n'),
    );
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

  const introInstruction = firstEver
    ? [
        '=== FIRST INTERACTION RULE ===',
        'This is your VERY FIRST reply to this user (no previous history exists).',
        'Open with a brief self-introduction in 1-2 short sentences:',
        '- Who you are (Dynamis, a personal career copilot for the AI era).',
        '- How you will help (listen, learn about them, and find ways to thrive WITH AI).',
        'Right after the introduction, continue naturally with the normal answer to',
        'their first message (no break, no separator). Do NOT introduce yourself again',
        'in future replies. Use the same language as the user.',
        '=== END FIRST INTERACTION RULE ===',
      ].join('\n')
    : '';

  const systemBlocks: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[] = [
    {
      type: 'text',
      text: stableSystem,
      cache_control: { type: 'ephemeral' },
    },
  ];
  if (introInstruction) {
    systemBlocks.push({ type: 'text', text: introInstruction });
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
    persistPromise.catch((e) => console.error('[persist] failed', e));
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

  const stableParts: string[] = [
    ASSISTANT_SYSTEM_PROMPT,
    [
      '',
      '=== VOICE MODE ===',
      'You are responding to a live voice conversation. Extra rules:',
      '- Keep answers concise by default, but complete.',
      '- For simple turns: short reply. For complex turns: expand as needed.',
      '- Always finish your thought. Do not truncate important context.',
      '- No lists, no bullet points, no markdown.',
      '- Sound natural when spoken aloud. Avoid abbreviations and symbols.',
      '- End with a short question or action only when it truly fits. Never force it.',
      '=== END VOICE MODE ===',
    ].join('\n'),
  ];
  if (profileBlock) {
    stableParts.push(`\n=== USER PROFILE ===\n${profileBlock}\n=== END USER PROFILE ===`);
  }
  if (longTermSummary) {
    stableParts.push(
      `\n=== USER BACKGROUND SUMMARY ===\n${longTermSummary}\n=== END USER BACKGROUND SUMMARY ===`,
    );
  }
  const stableSystem = stableParts.join('\n');

  const introInstruction = firstEver
    ? [
        '=== FIRST INTERACTION RULE ===',
        'This is your VERY FIRST reply to this user (no previous history exists).',
        'Open with a brief self-introduction in 1-2 short sentences:',
        '- Who you are (Dynamis, a personal career copilot for the AI era).',
        '- How you will help (listen, learn about them, and find ways to thrive WITH AI).',
        'Right after the introduction, continue naturally with the normal answer to',
        'their first message (no break, no separator). Do NOT introduce yourself again',
        'in future replies. Use the same language as the user.',
        '=== END FIRST INTERACTION RULE ===',
      ].join('\n')
    : '';

  const systemBlocks: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[] = [
    {
      type: 'text',
      text: stableSystem,
      cache_control: { type: 'ephemeral' },
    },
  ];
  if (introInstruction) {
    systemBlocks.push({ type: 'text', text: introInstruction });
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
    persistTurn(userId, sessionId, userMessage, finalReply).catch((e) =>
      console.error('[persist] failed', e),
    );
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
    return res.status(200).json({
      reply,
      session_id: sessionId,
    });
  } catch (error) {
    console.error('POST /chat error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

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

    const context: VoiceSessionContext = endpointingMs
      ? { userId, sessionId, sampleRate, endpointingMs }
      : { userId, sessionId, sampleRate };
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
        await runAgentVoiceStream(
          context.userId,
          context.sessionId,
          transcript,
          clientSocket as unknown as ClientSocketLike,
          signal,
          {
            interruptedReply,
            onReplyProgress: (text) => {
              activePartialReply = text;
              if (sessionState === 'thinking') transitionState('assistant_speaking');
            },
          },
        );
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
        });
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
        if (endOfTurn && transcript) {
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

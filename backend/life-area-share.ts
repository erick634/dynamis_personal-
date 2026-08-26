const { randomBytes } = require('node:crypto') as typeof import('node:crypto');

type Prisma = import('./generated/prisma').Prisma;
type PrismaClient = import('./generated/prisma').PrismaClient;
type LifeAreaShare = import('./generated/prisma').LifeAreaShare;

const SHARE_TOKEN_BYTES = 24;
const SHARE_TOKEN_MAX_ATTEMPTS = 5;
const MAX_IMAGES = 4;
const MAX_IMAGE_CHARS = 550_000;
const MAX_GOALS = 40;
const MAX_LINKS = 40;
const MAX_DOCUMENTS = 40;

class LifeAreaShareValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LifeAreaShareValidationError';
  }
}

type LifeAreaShareGoalPayload = {
  title: string;
  percent: number;
  completed: number;
  total: number;
  status: 'new' | 'behind' | 'partial' | 'onTrack';
  isAchievement: boolean;
  tasks: Array<{ title: string; cadence: string }>;
};

type LifeAreaSharePayload = {
  areaId: string;
  areaLabel: string;
  summary: string;
  motto: string;
  score: number;
  displayName: string | null;
  goals: LifeAreaShareGoalPayload[];
  links: Array<{ id: string; label: string; url: string }>;
  documents: Array<{ id: string; name: string; url: string }>;
  images: Array<{ id: string; name: string; dataUrl: string }>;
};

function isPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === code
  );
}

function createShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString('base64url');
}

function asTrimmedString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asNonNegInt(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

function asScore(value: unknown): number {
  return Math.max(0, Math.min(100, asNonNegInt(value, 0)));
}

function parseStatus(value: unknown): LifeAreaShareGoalPayload['status'] {
  if (value === 'new' || value === 'behind' || value === 'partial' || value === 'onTrack') {
    return value;
  }
  return 'new';
}

function normalizePayload(raw: unknown): LifeAreaSharePayload {
  if (!raw || typeof raw !== 'object') {
    throw new LifeAreaShareValidationError('Invalid share payload.');
  }
  const record = raw as Record<string, unknown>;
  const areaId = asTrimmedString(record.areaId);
  const areaLabel = asTrimmedString(record.areaLabel);
  if (!areaId || !areaLabel) {
    throw new LifeAreaShareValidationError('areaId and areaLabel are required.');
  }

  const goalsRaw = Array.isArray(record.goals) ? record.goals.slice(0, MAX_GOALS) : [];
  const goals: LifeAreaShareGoalPayload[] = [];
  for (const item of goalsRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const title = asTrimmedString(row.title);
    if (!title) continue;
    const tasksRaw = Array.isArray(row.tasks) ? row.tasks.slice(0, 20) : [];
    const tasks: Array<{ title: string; cadence: string }> = [];
    for (const task of tasksRaw) {
      if (!task || typeof task !== 'object') continue;
      const taskRow = task as Record<string, unknown>;
      const taskTitle = asTrimmedString(taskRow.title);
      if (!taskTitle) continue;
      tasks.push({
        title: taskTitle,
        cadence: asTrimmedString(taskRow.cadence, 'daily'),
      });
    }
    goals.push({
      title,
      percent: asScore(row.percent),
      completed: asNonNegInt(row.completed),
      total: asNonNegInt(row.total),
      status: parseStatus(row.status),
      isAchievement: Boolean(row.isAchievement),
      tasks,
    });
  }

  const linksRaw = Array.isArray(record.links) ? record.links.slice(0, MAX_LINKS) : [];
  const links: Array<{ id: string; label: string; url: string }> = [];
  for (const item of linksRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const label = asTrimmedString(row.label);
    const url = asTrimmedString(row.url);
    if (!label || !url) continue;
    const id = asTrimmedString(row.id) || `${label}:${url}`;
    links.push({ id, label, url });
  }

  const documentsRaw = Array.isArray(record.documents)
    ? record.documents.slice(0, MAX_DOCUMENTS)
    : [];
  const documents: Array<{ id: string; name: string; url: string }> = [];
  for (const item of documentsRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const name = asTrimmedString(row.name);
    const url = asTrimmedString(row.url);
    if (!name || !url) continue;
    const id = asTrimmedString(row.id) || `${name}:${url}`;
    documents.push({ id, name, url });
  }

  const imagesRaw = Array.isArray(record.images) ? record.images.slice(0, MAX_IMAGES) : [];
  const images: Array<{ id: string; name: string; dataUrl: string }> = [];
  for (const item of imagesRaw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const name = asTrimmedString(row.name);
    const dataUrl = asTrimmedString(row.dataUrl);
    if (!name || !dataUrl.startsWith('data:image/')) continue;
    if (dataUrl.length > MAX_IMAGE_CHARS) continue;
    const id = asTrimmedString(row.id) || name;
    images.push({ id, name, dataUrl });
  }

  const displayNameRaw = record.displayName;
  const displayName =
    typeof displayNameRaw === 'string' && displayNameRaw.trim() ? displayNameRaw.trim() : null;

  return {
    areaId,
    areaLabel,
    summary: asTrimmedString(record.summary),
    motto: asTrimmedString(record.motto),
    score: asScore(record.score),
    displayName,
    goals,
    links,
    documents,
    images,
  };
}

function createLifeAreaShareRepo(prisma: PrismaClient) {
  async function upsertShare(input: {
    userId: string;
    areaId: string;
    payload: unknown;
  }): Promise<{ share: LifeAreaShare; payload: LifeAreaSharePayload }> {
    const userId = String(input.userId ?? '').trim();
    const areaId = String(input.areaId ?? '').trim();
    if (!userId || !areaId) {
      throw new LifeAreaShareValidationError('user_id and area_id are required.');
    }

    const payload = normalizePayload(input.payload);
    if (payload.areaId !== areaId) {
      throw new LifeAreaShareValidationError('payload.areaId must match area_id.');
    }

    const existing = await prisma.lifeAreaShare.findUnique({
      where: { user_id_area_id: { user_id: userId, area_id: areaId } },
    });

    const now = new Date();
    if (existing) {
      const share = await prisma.lifeAreaShare.update({
        where: { id: existing.id },
        data: {
          payload: payload as Prisma.InputJsonValue,
          updated_at: now,
        },
      });
      return { share, payload };
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < SHARE_TOKEN_MAX_ATTEMPTS; attempt += 1) {
      const shareToken = createShareToken();
      try {
        const share = await prisma.lifeAreaShare.create({
          data: {
            user_id: userId,
            area_id: areaId,
            share_token: shareToken,
            payload: payload as Prisma.InputJsonValue,
            created_at: now,
            updated_at: now,
          },
        });
        return { share, payload };
      } catch (error) {
        if (isPrismaCode(error, 'P2002')) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('Failed to generate a unique share token.');
  }

  async function getPublicByToken(token: string): Promise<{
    share: LifeAreaShare;
    token: string;
    payload: LifeAreaSharePayload;
  } | null> {
    const shareToken = String(token ?? '').trim();
    if (!shareToken) return null;

    const share = await prisma.lifeAreaShare.findUnique({
      where: { share_token: shareToken },
    });
    if (!share) return null;

    try {
      const payload = normalizePayload(share.payload);
      return { share, token: share.share_token, payload };
    } catch {
      return null;
    }
  }

  async function getShareByToken(token: string): Promise<LifeAreaShare | null> {
    const shareToken = String(token ?? '').trim();
    if (!shareToken) return null;
    return prisma.lifeAreaShare.findUnique({
      where: { share_token: shareToken },
    });
  }

  async function getShareByOwner(userId: string, areaId: string): Promise<LifeAreaShare | null> {
    return prisma.lifeAreaShare.findUnique({
      where: { user_id_area_id: { user_id: userId, area_id: areaId } },
    });
  }

  return { upsertShare, getPublicByToken, getShareByToken, getShareByOwner, normalizePayload };
}

export = {
  createLifeAreaShareRepo,
  LifeAreaShareValidationError,
};

type PrismaClient = import('./generated/prisma').PrismaClient;
type LifeAreaShareComment = import('./generated/prisma').LifeAreaShareComment;

const MAX_AUTHOR_LEN = 60;
const MAX_BODY_LEN = 1000;
const MAX_LIST = 200;
const TARGET_TYPES = new Set(['profile', 'image', 'document']);

class LifeAreaShareCommentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LifeAreaShareCommentValidationError';
  }
}

type ShareAssetRef = { id: string; label: string };

type CommentShareContext = {
  shareId: string;
  userId: string;
  areaId: string;
  images: ShareAssetRef[];
  documents: ShareAssetRef[];
};

type SerializedShareComment = {
  id: string;
  target_type: 'profile' | 'image' | 'document';
  target_key: string | null;
  target_label: string | null;
  author_name: string;
  body: string;
  created_at: string;
};

function serializeComment(row: LifeAreaShareComment): SerializedShareComment {
  const targetType =
    row.target_type === 'image' || row.target_type === 'document' ? row.target_type : 'profile';
  return {
    id: row.id,
    target_type: targetType,
    target_key: row.target_key,
    target_label: row.target_label,
    author_name: row.author_name,
    body: row.body,
    created_at: row.created_at.toISOString(),
  };
}

function createLifeAreaShareCommentsRepo(prisma: PrismaClient) {
  async function listByShareId(shareId: string): Promise<SerializedShareComment[]> {
    const rows = await prisma.lifeAreaShareComment.findMany({
      where: { share_id: shareId },
      orderBy: { created_at: 'desc' },
      take: MAX_LIST,
    });
    return rows.map(serializeComment);
  }

  async function listByOwner(userId: string, areaId: string): Promise<SerializedShareComment[]> {
    const rows = await prisma.lifeAreaShareComment.findMany({
      where: { user_id: userId, area_id: areaId },
      orderBy: { created_at: 'desc' },
      take: MAX_LIST,
    });
    return rows.map(serializeComment);
  }

  async function addComment(
    ctx: CommentShareContext,
    input: {
      authorName: unknown;
      body: unknown;
      targetType: unknown;
      targetKey: unknown;
    },
  ): Promise<SerializedShareComment> {
    const authorName = String(input.authorName ?? '').trim();
    const body = String(input.body ?? '').trim();
    const targetType = String(input.targetType ?? 'profile').trim();
    const targetKeyRaw = String(input.targetKey ?? '').trim();

    if (authorName.length < 2 || authorName.length > MAX_AUTHOR_LEN) {
      throw new LifeAreaShareCommentValidationError(
        `author_name must be between 2 and ${String(MAX_AUTHOR_LEN)} characters.`,
      );
    }
    if (body.length < 1 || body.length > MAX_BODY_LEN) {
      throw new LifeAreaShareCommentValidationError(
        `body must be between 1 and ${String(MAX_BODY_LEN)} characters.`,
      );
    }
    if (!TARGET_TYPES.has(targetType)) {
      throw new LifeAreaShareCommentValidationError(
        'target_type must be profile, image, or document.',
      );
    }

    let targetKey: string | null = null;
    let targetLabel: string | null = null;

    if (targetType === 'profile') {
      targetKey = null;
      targetLabel = null;
    } else if (targetType === 'image') {
      const image = ctx.images.find((item) => item.id === targetKeyRaw);
      if (!image) {
        throw new LifeAreaShareCommentValidationError('Image not found on this share.');
      }
      targetKey = image.id;
      targetLabel = image.label;
    } else {
      const document = ctx.documents.find((item) => item.id === targetKeyRaw);
      if (!document) {
        throw new LifeAreaShareCommentValidationError('Document not found on this share.');
      }
      targetKey = document.id;
      targetLabel = document.label;
    }

    const created = await prisma.lifeAreaShareComment.create({
      data: {
        share_id: ctx.shareId,
        user_id: ctx.userId,
        area_id: ctx.areaId,
        target_type: targetType,
        target_key: targetKey,
        target_label: targetLabel,
        author_name: authorName,
        body,
        created_at: new Date(),
      },
    });

    return serializeComment(created);
  }

  return { listByShareId, listByOwner, addComment };
}

export = {
  createLifeAreaShareCommentsRepo,
  LifeAreaShareCommentValidationError,
};

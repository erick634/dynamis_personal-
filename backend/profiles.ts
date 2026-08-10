type PrismaClient = import('./generated/prisma').PrismaClient;
type Profile = import('./generated/prisma').Profile;

const PROFILE_SOURCES = new Set(['agent', 'user', 'promoted']);

class ProfileConflictError extends Error {
  constructor(message = 'A profile with this title already exists for this user.') {
    super(message);
    this.name = 'ProfileConflictError';
  }
}

class ProfileNotFoundError extends Error {
  constructor(message = 'Profile not found.') {
    super(message);
    this.name = 'ProfileNotFoundError';
  }
}

class ProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileValidationError';
  }
}

type CreateProfileInput = {
  user_id: string;
  title: string;
  context?: string | null;
  confidence: number;
  source: string;
};

type UpdateProfileInput = {
  title?: string;
  context?: string | null;
};

function isPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === code
  );
}

function normalizeOptionalContext(context: string | null | undefined): string | null {
  if (context === undefined || context === null) {
    return null;
  }
  const trimmed = String(context).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createProfilesRepo(prisma: PrismaClient) {
  async function listProfiles(userId: string): Promise<Profile[]> {
    return prisma.profile.findMany({
      where: { user_id: userId },
      orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
    });
  }

  async function createProfile(input: CreateProfileInput): Promise<Profile> {
    const title = String(input.title ?? '').trim();
    if (!title) {
      throw new ProfileValidationError('Invalid or missing title.');
    }
    if (
      typeof input.confidence !== 'number' ||
      !Number.isInteger(input.confidence) ||
      input.confidence < 0 ||
      input.confidence > 100
    ) {
      throw new ProfileValidationError('Invalid confidence. Expected integer 0-100.');
    }
    if (!PROFILE_SOURCES.has(input.source)) {
      throw new ProfileValidationError('Invalid source. Expected agent, user, or promoted.');
    }

    // First profile for this user becomes primary. Concurrent creates can race;
    // setPrimaryProfile remains the source of truth to correct duplicates.
    const existing = await listProfiles(input.user_id);
    const isPrimary = existing.length === 0;
    const now = new Date();

    try {
      return await prisma.profile.create({
        data: {
          user_id: input.user_id,
          title,
          context: normalizeOptionalContext(input.context),
          confidence: input.confidence,
          source: input.source,
          is_primary: isPrimary,
          created_at: now,
          updated_at: now,
        },
      });
    } catch (error) {
      if (isPrismaCode(error, 'P2002')) {
        throw new ProfileConflictError();
      }
      throw error;
    }
  }

  async function updateProfile(id: string, patch: UpdateProfileInput): Promise<Profile> {
    const hasTitle = patch.title !== undefined;
    const hasContext = patch.context !== undefined;
    if (!hasTitle && !hasContext) {
      throw new ProfileValidationError('No fields to update. Provide title and/or context.');
    }

    const data: {
      title?: string;
      context?: string | null;
      updated_at: Date;
    } = {
      updated_at: new Date(),
    };

    if (hasTitle) {
      const title = String(patch.title ?? '').trim();
      if (!title) {
        throw new ProfileValidationError('Invalid title.');
      }
      data.title = title;
    }
    if (hasContext) {
      data.context = normalizeOptionalContext(patch.context);
    }

    try {
      return await prisma.profile.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (isPrismaCode(error, 'P2002')) {
        throw new ProfileConflictError();
      }
      if (isPrismaCode(error, 'P2025')) {
        throw new ProfileNotFoundError();
      }
      throw error;
    }
  }

  async function setPrimaryProfile(id: string, userId: string): Promise<Profile> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.profile.findFirst({
        where: { id, user_id: userId },
      });
      if (!existing) {
        throw new ProfileNotFoundError();
      }

      await tx.profile.updateMany({
        where: {
          user_id: userId,
          id: { not: id },
          is_primary: true,
        },
        data: { is_primary: false },
      });

      return tx.profile.update({
        where: { id },
        data: {
          is_primary: true,
          updated_at: new Date(),
        },
      });
    });
  }

  return {
    createProfile,
    listProfiles,
    updateProfile,
    setPrimaryProfile,
  };
}

export = {
  createProfilesRepo,
  ProfileConflictError,
  ProfileNotFoundError,
  ProfileValidationError,
};

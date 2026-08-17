type PrismaClient = import('./generated/prisma').PrismaClient;
type PortfolioItem = import('./generated/prisma').PortfolioItem;

class PortfolioNotFoundError extends Error {
  constructor(message = 'Portfolio item not found.') {
    super(message);
    this.name = 'PortfolioNotFoundError';
  }
}

class PortfolioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortfolioValidationError';
  }
}

type PortfolioLinkInput = {
  label: string;
  url: string;
};

type CreatePortfolioItemInput = {
  user_id: string;
  title: string;
  description?: string | null;
  contribution?: string | null;
  links?: PortfolioLinkInput[];
  profile_ids?: string[];
};

type UpdatePortfolioItemInput = {
  title?: string;
  description?: string | null;
  contribution?: string | null;
  links?: PortfolioLinkInput[];
  profile_ids?: string[];
};

function isPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === code
  );
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLinks(raw: unknown): PortfolioLinkInput[] {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new PortfolioValidationError('Invalid links. Expected an array of { label, url }.');
  }
  const links: PortfolioLinkInput[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) {
      throw new PortfolioValidationError('Invalid links. Expected an array of { label, url }.');
    }
    const record = item as { label?: unknown; url?: unknown };
    const label = String(record.label ?? '').trim();
    const url = String(record.url ?? '').trim();
    if (!label || !url) {
      throw new PortfolioValidationError(
        'Invalid links. Each link needs a non-empty label and url.',
      );
    }
    links.push({ label, url });
  }
  return links;
}

function normalizeProfileIds(raw: unknown): string[] {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new PortfolioValidationError('Invalid profile_ids. Expected an array of strings.');
  }
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new PortfolioValidationError('Invalid profile_ids. Expected an array of strings.');
    }
    ids.push(item.trim());
  }
  return ids;
}

function createPortfolioRepo(prisma: PrismaClient) {
  async function createPortfolioItem(input: CreatePortfolioItemInput): Promise<PortfolioItem> {
    const title = String(input.title ?? '').trim();
    if (!title) {
      throw new PortfolioValidationError('Invalid or missing title.');
    }

    const now = new Date();
    const links = input.links === undefined ? [] : normalizeLinks(input.links);
    const profileIds =
      input.profile_ids === undefined ? [] : normalizeProfileIds(input.profile_ids);

    return prisma.portfolioItem.create({
      data: {
        user_id: input.user_id,
        title,
        description: normalizeOptionalText(input.description),
        contribution: normalizeOptionalText(input.contribution),
        links,
        profile_ids: profileIds,
        created_at: now,
        updated_at: now,
      },
    });
  }

  async function listPortfolioItems(userId: string, profileId?: string): Promise<PortfolioItem[]> {
    return prisma.portfolioItem.findMany({
      where: {
        user_id: userId,
        ...(profileId ? { profile_ids: { has: profileId } } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async function updatePortfolioItem(
    id: string,
    patch: UpdatePortfolioItemInput,
  ): Promise<PortfolioItem> {
    const hasTitle = patch.title !== undefined;
    const hasDescription = patch.description !== undefined;
    const hasContribution = patch.contribution !== undefined;
    const hasLinks = patch.links !== undefined;
    const hasProfileIds = patch.profile_ids !== undefined;

    if (!hasTitle && !hasDescription && !hasContribution && !hasLinks && !hasProfileIds) {
      throw new PortfolioValidationError(
        'No fields to update. Provide title, description, contribution, links, and/or profile_ids.',
      );
    }

    const data: {
      title?: string;
      description?: string | null;
      contribution?: string | null;
      links?: PortfolioLinkInput[];
      profile_ids?: string[];
      updated_at: Date;
    } = {
      updated_at: new Date(),
    };

    if (hasTitle) {
      const title = String(patch.title ?? '').trim();
      if (!title) {
        throw new PortfolioValidationError('Invalid title.');
      }
      data.title = title;
    }
    if (hasDescription) {
      data.description = normalizeOptionalText(patch.description);
    }
    if (hasContribution) {
      data.contribution = normalizeOptionalText(patch.contribution);
    }
    if (hasLinks) {
      data.links = normalizeLinks(patch.links);
    }
    if (hasProfileIds) {
      data.profile_ids = normalizeProfileIds(patch.profile_ids);
    }

    try {
      return await prisma.portfolioItem.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (isPrismaCode(error, 'P2025')) {
        throw new PortfolioNotFoundError();
      }
      throw error;
    }
  }

  async function deletePortfolioItem(id: string, userId: string): Promise<void> {
    const existing = await prisma.portfolioItem.findFirst({
      where: { id, user_id: userId },
      select: { id: true },
    });
    if (!existing) {
      throw new PortfolioNotFoundError();
    }
    await prisma.portfolioItem.delete({ where: { id } });
  }

  return {
    createPortfolioItem,
    listPortfolioItems,
    updatePortfolioItem,
    deletePortfolioItem,
  };
}

export = {
  createPortfolioRepo,
  PortfolioNotFoundError,
  PortfolioValidationError,
};

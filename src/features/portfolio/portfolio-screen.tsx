import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, ExternalLink } from 'lucide-react';

import { listPortfolioItems } from '@/features/portfolio/portfolio-api';
import type { PortfolioItem } from '@/features/portfolio/portfolio-types';
import { listProfiles } from '@/features/profiles/profiles-api';
import { useCurrentUser } from '@/stores/current-user';

const COLORS = {
  page: '#0b0d10',
  card: '#16191e',
  border: 'rgba(255, 255, 255, 0.08)',
  accent: '#4f7cff',
  text: '#f4f6f8',
  muted: '#a8b0bd',
} as const;

function DarkStatus({ title, body, icon }: { title: string; body?: string; icon?: ReactNode }) {
  return (
    <div
      className="mt-8 rounded-2xl border px-5 py-8 text-center"
      style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
    >
      {icon ? <div className="mb-4 flex justify-center text-[#a8b0bd]">{icon}</div> : null}
      <p className="font-display text-lg font-semibold text-[#f4f6f8]">{title}</p>
      {body ? (
        <p className="mt-2 font-body text-sm leading-relaxed text-[#a8b0bd]">{body}</p>
      ) : null}
    </div>
  );
}

function PortfolioCard({
  item,
  profileTitlesById,
}: {
  item: PortfolioItem;
  profileTitlesById: Map<string, string>;
}) {
  const linkedTitles = item.profile_ids
    .map((id) => profileTitlesById.get(id) ?? null)
    .filter((title): title is string => Boolean(title));

  return (
    <article
      className="rounded-2xl border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
      style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
    >
      <h2 className="font-display text-xl leading-snug font-semibold text-[#f4f6f8]">
        {item.title}
      </h2>

      {item.description ? (
        <p className="mt-2 font-body text-sm leading-relaxed text-[#a8b0bd]">{item.description}</p>
      ) : null}

      {item.contribution ? (
        <div className="mt-4">
          <p className="font-body text-[11px] font-semibold tracking-[0.14em] text-[#a8b0bd] uppercase">
            My contribution
          </p>
          <p className="mt-1.5 font-body text-sm leading-relaxed text-[#f4f6f8]">
            {item.contribution}
          </p>
        </div>
      ) : null}

      {item.links.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.links.map((link) => (
            <a
              key={`${link.label}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide text-[#a8b0bd] transition-colors hover:text-[#f4f6f8]"
              style={{ borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              {link.label}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ))}
        </div>
      ) : null}

      <div className="mt-4">
        {linkedTitles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {linkedTitles.map((title) => (
              <span
                key={title}
                className="inline-flex rounded-full px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide"
                style={{ backgroundColor: 'rgba(79, 124, 255, 0.18)', color: COLORS.accent }}
              >
                {title}
              </span>
            ))}
          </div>
        ) : (
          <p className="font-body text-[11px] tracking-wide text-[#a8b0bd]/opacity-70">
            Not linked to a profile yet
          </p>
        )}
      </div>
    </article>
  );
}

export function PortfolioScreen() {
  const userId = useCurrentUser((state) => state.user?.userId);

  const portfolioQuery = useQuery({
    queryKey: ['portfolio', userId],
    queryFn: () => {
      if (!userId) throw new Error('userId is required');
      return listPortfolioItems(userId);
    },
    enabled: Boolean(userId),
  });

  const profilesQuery = useQuery({
    queryKey: ['profiles', userId],
    queryFn: () => {
      if (!userId) throw new Error('userId is required');
      return listProfiles(userId);
    },
    enabled: Boolean(userId),
  });

  const isLoading = portfolioQuery.isLoading || profilesQuery.isLoading;
  const isError = portfolioQuery.isError || profilesQuery.isError;
  const error = portfolioQuery.error ?? profilesQuery.error;
  const items = portfolioQuery.data ?? [];
  const isEmpty = Boolean(userId) && !isLoading && !isError && items.length === 0;

  const profileTitlesById = new Map(
    (profilesQuery.data ?? []).map((profile) => [profile.id, profile.title]),
  );

  return (
    <div className="min-h-full w-full" style={{ backgroundColor: COLORS.page, color: COLORS.text }}>
      <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-8 sm:px-6 md:max-w-2xl md:px-8">
        <header className="w-full min-w-0">
          <p
            className="font-body text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{ color: COLORS.accent }}
          >
            Library
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold md:text-4xl">
            Portfolio
          </h1>
          <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-[#a8b0bd]">
            Projects and work you can attach to your professional profiles.
          </p>
        </header>

        {!userId ? (
          <DarkStatus
            title="Sign in to see your portfolio"
            body="Create or restore a session, then return here."
            icon={<Briefcase className="size-6" aria-hidden />}
          />
        ) : null}

        {userId && isLoading ? (
          <DarkStatus
            title="Loading your portfolio…"
            icon={<Briefcase className="size-6 animate-pulse" aria-hidden />}
          />
        ) : null}

        {userId && isError ? (
          <DarkStatus
            title="Couldn’t load your portfolio"
            body={error instanceof Error ? error.message : 'Something went wrong.'}
          />
        ) : null}

        {isEmpty ? (
          <DarkStatus
            title="No projects yet"
            body="Add your work to build your portfolio."
            icon={<Briefcase className="size-6" aria-hidden />}
          />
        ) : null}

        {userId && !isLoading && !isError && items.length > 0 ? (
          <ul className="mt-8 flex list-none flex-col gap-4 p-0">
            {items.map((item) => (
              <li key={item.id}>
                <PortfolioCard item={item} profileTitlesById={profileTitlesById} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

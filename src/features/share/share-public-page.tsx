import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { ReactNode } from 'react';

import { BrandIcon } from '@/components/ui/brand-icon';
import {
  fetchPublicShare,
  ShareNotFoundError,
  type PublicShareData,
  type PublicSharePortfolioItem,
} from '@/features/share/share-public-api';

const COLORS = {
  page: '#0b0d10',
  card: '#16191e',
  border: 'rgba(255, 255, 255, 0.08)',
  accent: '#4f7cff',
  text: '#f4f6f8',
  muted: '#a8b0bd',
  track: 'rgba(255, 255, 255, 0.08)',
} as const;

function ConfidenceBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-body text-[11px] font-semibold tracking-[0.14em] text-[#a8b0bd] uppercase">
          Profile confidence
        </span>
        <span className="font-body text-sm font-semibold text-[#f4f6f8]">{`${String(clamped)}%`}</span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: COLORS.track }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${String(clamped)}%`, backgroundColor: COLORS.accent }}
        />
      </div>
    </div>
  );
}

function PortfolioCard({ item }: { item: PublicSharePortfolioItem }) {
  return (
    <article
      className="rounded-2xl border p-5"
      style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
    >
      <h3 className="font-display text-xl font-semibold text-[#f4f6f8]">{item.title}</h3>
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
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide text-[#a8b0bd] hover:text-[#f4f6f8]"
              style={{ borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              {link.label}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function UnlockFooter() {
  return (
    <footer className="mt-12 flex flex-col items-center gap-2 pb-8 text-center">
      <BrandIcon className="h-4 w-4 text-[#a8b0bd]" />
      <p className="font-body text-xs tracking-wide text-[#a8b0bd]">Made with Unlock</p>
    </footer>
  );
}

function ShareShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh w-full" style={{ backgroundColor: COLORS.page, color: COLORS.text }}>
      <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 md:max-w-2xl md:px-8">
        {children}
        <UnlockFooter />
      </div>
    </div>
  );
}

function ShareSuccess({ data }: { data: PublicShareData }) {
  return (
    <ShareShell>
      <p
        className="font-body text-[11px] font-semibold tracking-[0.18em] uppercase"
        style={{ color: COLORS.accent }}
      >
        Professional profile
      </p>
      <h1 className="mt-3 font-display text-4xl leading-tight font-semibold md:text-5xl">
        {data.profile.title}
      </h1>
      {data.profile.context ? (
        <p className="mt-4 whitespace-pre-line font-body text-base leading-relaxed text-[#a8b0bd]">
          {data.profile.context}
        </p>
      ) : null}
      <ConfidenceBar value={data.profile.confidence} />

      <div className="mt-10 border-t pt-8" style={{ borderColor: COLORS.border }}>
        <p className="font-body text-[11px] font-semibold tracking-[0.18em] text-[#a8b0bd] uppercase">
          Projects & work
        </p>
        {data.portfolio.length === 0 ? (
          <p className="mt-4 font-body text-sm text-[#a8b0bd]">No projects shared yet.</p>
        ) : (
          <ul className="mt-4 flex list-none flex-col gap-4 p-0">
            {data.portfolio.map((item, index) => (
              <li key={`${item.title}-${String(index)}`}>
                <PortfolioCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </ShareShell>
  );
}

export function SharePublicPage() {
  const { token } = useParams<{ token: string }>();
  const shareToken = (token ?? '').trim();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-share', shareToken],
    queryFn: () => fetchPublicShare(shareToken),
    enabled: shareToken.length > 0,
    retry: false,
  });

  if (!shareToken || (isError && error instanceof ShareNotFoundError)) {
    return (
      <ShareShell>
        <h1 className="font-display text-3xl leading-tight font-semibold md:text-4xl">
          This profile isn't available
        </h1>
        <p className="mt-4 font-body text-base leading-relaxed text-[#a8b0bd]">
          This link may have been turned off or is incorrect. Ask the person who shared it for a new
          link.
        </p>
      </ShareShell>
    );
  }

  if (isLoading) {
    return (
      <ShareShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="font-body text-sm text-[#a8b0bd]">Loading profile…</p>
        </div>
      </ShareShell>
    );
  }

  if (isError || !data) {
    return (
      <ShareShell>
        <h1 className="font-display text-3xl font-semibold">Couldn't load this profile</h1>
        <p className="mt-4 font-body text-sm text-[#a8b0bd]">
          {error instanceof Error ? error.message : 'Please try again in a moment.'}
        </p>
      </ShareShell>
    );
  }

  return <ShareSuccess data={data} />;
}

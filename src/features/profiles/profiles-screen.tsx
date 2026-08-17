import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Sparkles } from 'lucide-react';

import { listProfiles } from '@/features/profiles/profiles-api';
import type { Profile } from '@/features/profiles/profiles-types';
import { useCurrentUser } from '@/stores/current-user';

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
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-body text-[11px] font-semibold tracking-[0.14em] text-[#a8b0bd] uppercase">
          Confidence
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
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${String(clamped)}%`, backgroundColor: COLORS.accent }}
        />
      </div>
    </div>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <article
      className="rounded-2xl border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
      style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl leading-snug font-semibold text-[#f4f6f8]">
            {profile.title}
          </h2>
          {profile.context ? (
            <p className="mt-2 font-body text-sm leading-relaxed text-[#a8b0bd]">
              {profile.context}
            </p>
          ) : null}
        </div>
        {profile.is_primary ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide"
            style={{ backgroundColor: 'rgba(79, 124, 255, 0.18)', color: COLORS.accent }}
          >
            <Sparkles className="size-3" aria-hidden />
            Primary
          </span>
        ) : null}
      </div>
      <ConfidenceBar value={profile.confidence} />
    </article>
  );
}

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

export function ProfilesScreen() {
  const userId = useCurrentUser((state) => state.user?.userId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['profiles', userId],
    queryFn: () => {
      if (!userId) {
        throw new Error('userId is required');
      }
      return listProfiles(userId);
    },
    enabled: Boolean(userId),
  });

  const profiles = data ?? [];
  const isEmpty = Boolean(userId) && !isLoading && !isError && profiles.length === 0;

  return (
    <div className="min-h-full w-full" style={{ backgroundColor: COLORS.page, color: COLORS.text }}>
      <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-8 sm:px-6 md:max-w-2xl md:px-8">
        <header className="w-full min-w-0">
          <p
            className="font-body text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{ color: COLORS.accent }}
          >
            Identity
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight font-semibold md:text-4xl">
            My <em className="italic">profiles</em>
          </h1>
          <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-[#a8b0bd]">
            Distinct professional sides Dynamis has gathered from your conversations.
          </p>
        </header>

        {!userId ? (
          <DarkStatus
            title="Sign in to see your profiles"
            body="Create or restore a session, then return here."
            icon={<Layers className="size-6" aria-hidden />}
          />
        ) : null}

        {userId && isLoading ? (
          <DarkStatus
            title="Loading your profiles…"
            icon={<Layers className="size-6 animate-pulse" aria-hidden />}
          />
        ) : null}

        {userId && isError ? (
          <DarkStatus
            title="Couldn’t load your profiles"
            body={error instanceof Error ? error.message : 'Something went wrong.'}
          />
        ) : null}

        {isEmpty ? (
          <DarkStatus
            title="No profiles yet"
            body="Talk to Dynamis and I'll build them from your conversation."
            icon={<Layers className="size-6" aria-hidden />}
          />
        ) : null}

        {userId && !isLoading && !isError && profiles.length > 0 ? (
          <ul className="mt-8 flex list-none flex-col gap-4 p-0">
            {profiles.map((profile) => (
              <li key={profile.id}>
                <ProfileCard profile={profile} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

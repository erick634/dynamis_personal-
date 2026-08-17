import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Pencil, Sparkles } from 'lucide-react';

import { listProfiles, setPrimaryProfile, updateProfile } from '@/features/profiles/profiles-api';
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
  danger: '#f87171',
  overlay: 'rgba(0, 0, 0, 0.65)',
} as const;

const PROFILES_QUERY_KEY = 'profiles' as const;

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

function ProfileCard({
  profile,
  isPrimaryPending,
  onSetPrimary,
  onEdit,
}: {
  profile: Profile;
  isPrimaryPending: boolean;
  onSetPrimary: (profile: Profile) => void;
  onEdit: (profile: Profile) => void;
}) {
  const canSetPrimary = !profile.is_primary && !isPrimaryPending;

  return (
    <article
      className={`rounded-2xl border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-opacity ${
        canSetPrimary ? 'cursor-pointer hover:border-[rgba(79,124,255,0.35)]' : ''
      } ${isPrimaryPending ? 'pointer-events-none opacity-60' : ''}`}
      style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
      title={canSetPrimary ? 'Set as primary' : undefined}
      onClick={() => {
        if (canSetPrimary) onSetPrimary(profile);
      }}
      onKeyDown={(event) => {
        if (!canSetPrimary) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSetPrimary(profile);
        }
      }}
      role={canSetPrimary ? 'button' : undefined}
      tabIndex={canSetPrimary ? 0 : undefined}
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
          {canSetPrimary ? (
            <p className="mt-2 font-body text-[11px] tracking-wide text-[#a8b0bd]/opacity-70">
              Set as primary
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {profile.is_primary ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide"
              style={{ backgroundColor: 'rgba(79, 124, 255, 0.18)', color: COLORS.accent }}
            >
              <Sparkles className="size-3" aria-hidden />
              Primary
            </span>
          ) : null}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide text-[#a8b0bd] transition-colors hover:text-[#f4f6f8]"
            style={{ borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.03)' }}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(profile);
            }}
          >
            <Pencil className="size-3" aria-hidden />
            Edit
          </button>
        </div>
      </div>
      <ConfidenceBar value={profile.confidence} />
    </article>
  );
}

function EditProfileModal({
  profile,
  isSaving,
  errorMessage,
  onClose,
  onSave,
}: {
  profile: Profile;
  isSaving: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSave: (patch: { title: string; context: string | null }) => void;
}) {
  const titleId = useId();
  const contextId = useId();
  const [title, setTitle] = useState(profile.title);
  const [context, setContext] = useState(profile.context ?? '');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isSaving, onClose]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle || isSaving) return;
    const trimmedContext = context.trim();
    onSave({ title: nextTitle, context: trimmedContext.length > 0 ? trimmedContext : null });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: COLORS.overlay }}
      onClick={() => {
        if (!isSaving) onClose();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border p-5 shadow-2xl"
        style={{ backgroundColor: COLORS.card, borderColor: COLORS.border, color: COLORS.text }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2 id={titleId} className="font-display text-xl font-semibold">
          Edit profile
        </h2>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block" htmlFor={`${titleId}-input`}>
            <span className="font-body text-[11px] font-semibold tracking-[0.14em] text-[#a8b0bd] uppercase">
              Title
            </span>
            <input
              id={`${titleId}-input`}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              className="mt-2 w-full rounded-xl border bg-transparent px-3 py-2.5 font-body text-sm text-[#f4f6f8] outline-none focus:border-[rgba(79,124,255,0.55)]"
              style={{ borderColor: COLORS.border }}
              disabled={isSaving}
              autoFocus
              required
            />
          </label>
          <label className="block" htmlFor={contextId}>
            <span className="font-body text-[11px] font-semibold tracking-[0.14em] text-[#a8b0bd] uppercase">
              Context
            </span>
            <textarea
              id={contextId}
              value={context}
              onChange={(event) => {
                setContext(event.target.value);
              }}
              rows={4}
              className="mt-2 w-full resize-y rounded-xl border bg-transparent px-3 py-2.5 font-body text-sm text-[#f4f6f8] outline-none focus:border-[rgba(79,124,255,0.55)]"
              style={{ borderColor: COLORS.border }}
              disabled={isSaving}
            />
          </label>
          {errorMessage ? (
            <p className="font-body text-sm" style={{ color: COLORS.danger }} role="alert">
              {errorMessage}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="rounded-full border px-4 py-2 font-body text-sm text-[#a8b0bd] hover:text-[#f4f6f8]"
              style={{ borderColor: COLORS.border }}
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: COLORS.accent }}
              disabled={isSaving || title.trim().length === 0}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

function editErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('(409)')) {
    return 'A profile with this title already exists';
  }
  return message || 'Something went wrong.';
}

export function ProfilesScreen() {
  const userId = useCurrentUser((state) => state.user?.userId);
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [PROFILES_QUERY_KEY, userId],
    queryFn: () => {
      if (!userId) throw new Error('userId is required');
      return listProfiles(userId);
    },
    enabled: Boolean(userId),
  });

  const primaryMutation = useMutation({
    mutationFn: (profileId: string) => {
      if (!userId) throw new Error('userId is required');
      return setPrimaryProfile(profileId, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PROFILES_QUERY_KEY, userId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { title: string; context: string | null } }) =>
      updateProfile(id, patch),
    onSuccess: async () => {
      setEditError(null);
      setEditingProfile(null);
      await queryClient.invalidateQueries({ queryKey: [PROFILES_QUERY_KEY, userId] });
    },
    onError: (err) => {
      setEditError(editErrorMessage(err));
    },
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
                <ProfileCard
                  profile={profile}
                  isPrimaryPending={
                    primaryMutation.isPending && primaryMutation.variables === profile.id
                  }
                  onSetPrimary={(next) => {
                    primaryMutation.mutate(next.id);
                  }}
                  onEdit={(next) => {
                    setEditError(null);
                    setEditingProfile(next);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {editingProfile ? (
        <EditProfileModal
          key={editingProfile.id}
          profile={editingProfile}
          isSaving={updateMutation.isPending}
          errorMessage={editError}
          onClose={() => {
            if (updateMutation.isPending) return;
            setEditError(null);
            setEditingProfile(null);
          }}
          onSave={(patch) => {
            updateMutation.mutate({ id: editingProfile.id, patch });
          }}
        />
      ) : null}
    </div>
  );
}

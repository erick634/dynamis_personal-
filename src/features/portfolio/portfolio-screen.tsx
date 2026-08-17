import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react';

import {
  createPortfolioItem,
  deletePortfolioItem,
  listPortfolioItems,
  updatePortfolioItem,
} from '@/features/portfolio/portfolio-api';
import type { PortfolioItem, PortfolioLink } from '@/features/portfolio/portfolio-types';
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
  danger: '#f87171',
} as const;

const PORTFOLIO_QUERY_KEY = 'portfolio' as const;

type LinkDraft = { label: string; url: string };
type FormState = {
  title: string;
  description: string;
  contribution: string;
  links: LinkDraft[];
  profileIds: string[];
};

function emptyForm(): FormState {
  return { title: '', description: '', contribution: '', links: [], profileIds: [] };
}

function formFromItem(item: PortfolioItem): FormState {
  return {
    title: item.title,
    description: item.description ?? '',
    contribution: item.contribution ?? '',
    links: item.links.map((link) => ({ label: link.label, url: link.url })),
    profileIds: [...item.profile_ids],
  };
}

function sanitizeLinks(links: LinkDraft[]): PortfolioLink[] {
  return links
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label.length > 0 || link.url.length > 0)
    .filter((link) => link.label.length > 0 && link.url.length > 0);
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

function PortfolioForm({
  mode,
  form,
  profiles,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  form: FormState;
  profiles: Profile[];
  isSaving: boolean;
  onChange: (next: FormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const canSubmit = form.title.trim().length > 0 && !isSaving;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  return (
    <form
      className="mt-6 rounded-2xl border p-5"
      style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
      onSubmit={handleSubmit}
    >
      <h2 className="font-display text-lg font-semibold text-[#f4f6f8]">
        {mode === 'create' ? 'Add project' : 'Edit project'}
      </h2>

      <label className="mt-4 block">
        <span className="font-body text-[11px] font-semibold tracking-[0.14em] text-[#a8b0bd] uppercase">
          Title
        </span>
        <input
          value={form.title}
          onChange={(e) => {
            onChange({ ...form, title: e.target.value });
          }}
          className="mt-2 w-full rounded-xl border bg-transparent px-3 py-2.5 font-body text-sm text-[#f4f6f8] outline-none focus:border-[rgba(79,124,255,0.55)]"
          style={{ borderColor: COLORS.border }}
          disabled={isSaving}
          required
        />
      </label>

      <label className="mt-4 block">
        <span className="font-body text-[11px] font-semibold tracking-[0.14em] text-[#a8b0bd] uppercase">
          Description
        </span>
        <textarea
          value={form.description}
          onChange={(e) => {
            onChange({ ...form, description: e.target.value });
          }}
          rows={3}
          className="mt-2 w-full resize-y rounded-xl border bg-transparent px-3 py-2.5 font-body text-sm text-[#f4f6f8] outline-none focus:border-[rgba(79,124,255,0.55)]"
          style={{ borderColor: COLORS.border }}
          disabled={isSaving}
        />
      </label>

      <label className="mt-4 block">
        <span className="font-body text-[11px] font-semibold tracking-[0.14em] text-[#a8b0bd] uppercase">
          My contribution
        </span>
        <textarea
          value={form.contribution}
          onChange={(e) => {
            onChange({ ...form, contribution: e.target.value });
          }}
          rows={3}
          className="mt-2 w-full resize-y rounded-xl border bg-transparent px-3 py-2.5 font-body text-sm text-[#f4f6f8] outline-none focus:border-[rgba(79,124,255,0.55)]"
          style={{ borderColor: COLORS.border }}
          disabled={isSaving}
        />
      </label>

      <div className="mt-4">
        <p className="font-body text-[11px] font-semibold tracking-[0.14em] text-[#a8b0bd] uppercase">
          Links
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {form.links.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={link.label}
                placeholder="Label"
                onChange={(e) => {
                  const links = form.links.map((row, i) =>
                    i === index ? { ...row, label: e.target.value } : row,
                  );
                  onChange({ ...form, links });
                }}
                className="min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-2 font-body text-sm text-[#f4f6f8] outline-none"
                style={{ borderColor: COLORS.border }}
                disabled={isSaving}
              />
              <input
                value={link.url}
                placeholder="https://"
                onChange={(e) => {
                  const links = form.links.map((row, i) =>
                    i === index ? { ...row, url: e.target.value } : row,
                  );
                  onChange({ ...form, links });
                }}
                className="min-w-0 flex-[1.4] rounded-xl border bg-transparent px-3 py-2 font-body text-sm text-[#f4f6f8] outline-none"
                style={{ borderColor: COLORS.border }}
                disabled={isSaving}
              />
              <button
                type="button"
                className="rounded-full border p-2 text-[#a8b0bd] hover:text-[#f4f6f8]"
                style={{ borderColor: COLORS.border }}
                onClick={() => {
                  onChange({ ...form, links: form.links.filter((_, i) => i !== index) });
                }}
                disabled={isSaving}
                aria-label="Remove link"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 font-body text-[11px] font-semibold tracking-wide text-[#a8b0bd] hover:text-[#f4f6f8]"
          onClick={() => {
            onChange({ ...form, links: [...form.links, { label: '', url: '' }] });
          }}
          disabled={isSaving}
        >
          <Plus className="size-3.5" aria-hidden />
          Add link
        </button>
      </div>

      <div className="mt-4">
        <p className="font-body text-[11px] font-semibold tracking-[0.14em] text-[#a8b0bd] uppercase">
          Profiles
        </p>
        {profiles.length === 0 ? (
          <p className="mt-2 font-body text-sm text-[#a8b0bd]">No profiles yet to link.</p>
        ) : (
          <ul className="mt-2 flex list-none flex-col gap-2 p-0">
            {profiles.map((profile) => {
              const checked = form.profileIds.includes(profile.id);
              return (
                <li key={profile.id}>
                  <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-[#f4f6f8]">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isSaving}
                      onChange={() => {
                        const profileIds = checked
                          ? form.profileIds.filter((id) => id !== profile.id)
                          : [...form.profileIds, profile.id];
                        onChange({ ...form, profileIds });
                      }}
                    />
                    {profile.title}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-full border px-4 py-2 font-body text-sm text-[#a8b0bd] hover:text-[#f4f6f8]"
          style={{ borderColor: COLORS.border }}
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-full px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: COLORS.accent }}
          disabled={!canSubmit}
        >
          {isSaving ? 'Saving…' : mode === 'create' ? 'Add project' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function PortfolioCard({
  item,
  profileTitlesById,
  pendingDelete,
  isDeleting,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  item: PortfolioItem;
  profileTitlesById: Map<string, string>;
  pendingDelete: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const linkedTitles = item.profile_ids
    .map((id) => profileTitlesById.get(id) ?? null)
    .filter((title): title is string => Boolean(title));

  return (
    <article
      className="rounded-2xl border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
      style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 font-display text-xl leading-snug font-semibold text-[#f4f6f8]">
          {item.title}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide text-[#a8b0bd] hover:text-[#f4f6f8]"
            style={{ borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.03)' }}
            onClick={onEdit}
          >
            <Pencil className="size-3" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide text-[#a8b0bd] hover:text-[#f87171]"
            style={{ borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.03)' }}
            onClick={onAskDelete}
          >
            <Trash2 className="size-3" aria-hidden />
            Delete
          </button>
        </div>
      </div>

      {pendingDelete ? (
        <div
          className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: 'rgba(248, 113, 113, 0.35)' }}
        >
          <p className="font-body text-sm" style={{ color: COLORS.danger }}>
            Delete?
          </p>
          <button
            type="button"
            className="rounded-full px-3 py-1 font-body text-[11px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: COLORS.danger }}
            onClick={onConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Yes'}
          </button>
          <button
            type="button"
            className="rounded-full border px-3 py-1 font-body text-[11px] font-semibold text-[#a8b0bd]"
            style={{ borderColor: COLORS.border }}
            onClick={onCancelDelete}
            disabled={isDeleting}
          >
            No
          </button>
        </div>
      ) : null}

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
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-body text-[11px] font-semibold tracking-wide text-[#a8b0bd] hover:text-[#f4f6f8]"
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
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const portfolioQuery = useQuery({
    queryKey: [PORTFOLIO_QUERY_KEY, userId],
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

  const invalidatePortfolio = async () => {
    await queryClient.invalidateQueries({ queryKey: [PORTFOLIO_QUERY_KEY, userId] });
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const createMutation = useMutation({
    mutationFn: createPortfolioItem,
    onSuccess: async () => {
      closeForm();
      await invalidatePortfolio();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updatePortfolioItem>[1] }) =>
      updatePortfolioItem(id, patch),
    onSuccess: async () => {
      closeForm();
      await invalidatePortfolio();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error('userId is required');
      return deletePortfolioItem(id, userId);
    },
    onSuccess: async () => {
      setPendingDeleteId(null);
      await invalidatePortfolio();
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isLoading = portfolioQuery.isLoading || profilesQuery.isLoading;
  const isError = portfolioQuery.isError || profilesQuery.isError;
  const error = portfolioQuery.error ?? profilesQuery.error;
  const items = portfolioQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];
  const isEmpty = Boolean(userId) && !isLoading && !isError && items.length === 0;
  const profileTitlesById = new Map(profiles.map((profile) => [profile.id, profile.title]));

  const openCreate = () => {
    setPendingDeleteId(null);
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (item: PortfolioItem) => {
    setPendingDeleteId(null);
    setEditingId(item.id);
    setForm(formFromItem(item));
    setFormOpen(true);
  };

  const submitForm = () => {
    if (!userId) return;
    const title = form.title.trim();
    if (!title) return;
    const description = form.description.trim();
    const contribution = form.contribution.trim();
    const payload = {
      title,
      description: description.length > 0 ? description : null,
      contribution: contribution.length > 0 ? contribution : null,
      links: sanitizeLinks(form.links),
      profile_ids: form.profileIds,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, patch: payload });
    } else {
      createMutation.mutate({ user_id: userId, ...payload });
    }
  };

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

        {userId && !isLoading && !isError ? (
          <div className="mt-6">
            {!formOpen ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-body text-sm font-semibold text-white"
                style={{ backgroundColor: COLORS.accent }}
                onClick={openCreate}
              >
                <Plus className="size-4" aria-hidden />
                Add project
              </button>
            ) : null}

            {formOpen ? (
              <PortfolioForm
                mode={editingId ? 'edit' : 'create'}
                form={form}
                profiles={profiles}
                isSaving={isSaving}
                onChange={setForm}
                onCancel={closeForm}
                onSubmit={submitForm}
              />
            ) : null}

            {isEmpty && !formOpen ? (
              <DarkStatus
                title="No projects yet"
                body="Add your work to build your portfolio."
                icon={<Briefcase className="size-6" aria-hidden />}
              />
            ) : null}

            {items.length > 0 ? (
              <ul className="mt-6 flex list-none flex-col gap-4 p-0">
                {items.map((item) => (
                  <li key={item.id}>
                    <PortfolioCard
                      item={item}
                      profileTitlesById={profileTitlesById}
                      pendingDelete={pendingDeleteId === item.id}
                      isDeleting={deleteMutation.isPending && deleteMutation.variables === item.id}
                      onEdit={() => {
                        openEdit(item);
                      }}
                      onAskDelete={() => {
                        setPendingDeleteId(item.id);
                      }}
                      onCancelDelete={() => {
                        setPendingDeleteId(null);
                      }}
                      onConfirmDelete={() => {
                        deleteMutation.mutate(item.id);
                      }}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

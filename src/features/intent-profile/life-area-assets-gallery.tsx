import { ExternalLink, FileText, Images, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LifeAreaGoalRelationSelect } from '@/features/intent-profile/life-area-goal-relation-select';
import { ProgressReasonEditor } from '@/features/intent-profile/life-area-progress-reason';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';
import { countAreaAssets, type LifeAreaContent } from '@/features/intent-profile/use-life-areas';

type PendingDelete =
  | { kind: 'link'; id: string; label: string }
  | { kind: 'document'; id: string; label: string }
  | { kind: 'image'; id: string; label: string };

type LifeAreaAssetsGalleryProps = {
  content: LifeAreaContent;
  goals: LifeAreaUserGoal[];
  onRemoveLink: (linkId: string) => void;
  onRemoveDocument: (documentId: string) => void;
  onRemoveImage: (imageId: string) => void;
  onLinkReasonCommit: (linkId: string, reason: string) => void;
  onDocumentReasonCommit: (documentId: string, reason: string) => void;
  onImageReasonCommit: (imageId: string, reason: string) => void;
  onSetAssetGoalId: (
    kind: 'link' | 'document' | 'image',
    assetId: string,
    goalId: string | null,
  ) => void;
};

export function LifeAreaAssetsGallery({
  content,
  goals,
  onRemoveLink,
  onRemoveDocument,
  onRemoveImage,
  onLinkReasonCommit,
  onDocumentReasonCommit,
  onImageReasonCommit,
  onSetAssetGoalId,
}: LifeAreaAssetsGalleryProps) {
  const { t } = useTranslation();
  const total = countAreaAssets(content);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'link') onRemoveLink(pendingDelete.id);
    if (pendingDelete.kind === 'document') onRemoveDocument(pendingDelete.id);
    if (pendingDelete.kind === 'image') onRemoveImage(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <section className="mt-2 rounded-2xl border border-line-soft/80 bg-bg/40 p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ink">
            <Images className="size-4 text-blue" aria-hidden />
            {t('you.lifeArea.assets.galleryTitle')}
          </h2>
          <p className="mt-1 font-body text-xs text-ink-3">
            {t('you.lifeArea.assets.gallerySubtitle')}
          </p>
        </div>
        {total > 0 ? (
          <span className="rounded-full bg-blue-soft/80 px-2.5 py-0.5 font-body text-[11px] font-semibold tabular-nums text-blue">
            {t('you.lifeArea.assets.galleryCount', { count: total })}
          </span>
        ) : null}
      </div>

      {total === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-8 text-center font-body text-sm text-ink-3">
          {t('you.lifeArea.assets.galleryEmpty')}
        </p>
      ) : (
        <ul className="mt-4 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {content.images.map((image) => (
            <li
              key={`image-${image.id}`}
              className="overflow-hidden rounded-2xl border border-line-soft bg-white"
            >
              <div className="relative">
                <img
                  src={image.dataUrl}
                  alt={image.name}
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="absolute top-2 left-2 rounded-full bg-white/95 px-2 py-0.5 font-body text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
                  {t('you.lifeArea.assets.kindImage')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPendingDelete({ kind: 'image', id: image.id, label: image.name });
                  }}
                  className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-white/95 text-ink-3 hover:text-ink"
                  aria-label={t('you.lifeArea.assets.remove')}
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="space-y-2 px-3 py-2.5">
                <p className="truncate font-body text-sm font-medium text-ink">{image.name}</p>
                <ProgressReasonEditor
                  value={image.progressReason}
                  onCommit={(reason) => {
                    onImageReasonCommit(image.id, reason);
                  }}
                />
                <LifeAreaGoalRelationSelect
                  goals={goals}
                  value={image.goalId}
                  onChange={(goalId) => {
                    onSetAssetGoalId('image', image.id, goalId);
                  }}
                />
              </div>
            </li>
          ))}

          {content.documents.map((doc) => (
            <li
              key={`document-${doc.id}`}
              className="flex flex-col rounded-2xl border border-line-soft bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full bg-bg px-2 py-0.5 font-body text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
                  {t('you.lifeArea.assets.kindDocument')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPendingDelete({ kind: 'document', id: doc.id, label: doc.name });
                  }}
                  className="shrink-0 text-ink-3 hover:text-ink"
                  aria-label={t('you.lifeArea.assets.remove')}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-w-0 items-center gap-2 font-body text-sm font-medium text-ink hover:text-blue"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-soft/70 text-blue">
                  <FileText className="size-4" aria-hidden />
                </span>
                <span className="truncate">{doc.name}</span>
              </a>
              <div className="mt-auto space-y-2 pt-2">
                <ProgressReasonEditor
                  value={doc.progressReason}
                  onCommit={(reason) => {
                    onDocumentReasonCommit(doc.id, reason);
                  }}
                />
                <LifeAreaGoalRelationSelect
                  goals={goals}
                  value={doc.goalId}
                  onChange={(goalId) => {
                    onSetAssetGoalId('document', doc.id, goalId);
                  }}
                />
              </div>
            </li>
          ))}

          {content.links.map((link) => (
            <li
              key={`link-${link.id}`}
              className="flex flex-col rounded-2xl border border-line-soft bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full bg-bg px-2 py-0.5 font-body text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
                  {t('you.lifeArea.assets.kindLink')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPendingDelete({ kind: 'link', id: link.id, label: link.label });
                  }}
                  className="shrink-0 text-ink-3 hover:text-ink"
                  aria-label={t('you.lifeArea.assets.remove')}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-w-0 items-center gap-2 font-body text-sm font-medium text-blue hover:underline"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-soft/70 text-blue">
                  <ExternalLink className="size-4" aria-hidden />
                </span>
                <span className="truncate">{link.label}</span>
              </a>
              <div className="mt-auto space-y-2 pt-2">
                <ProgressReasonEditor
                  value={link.progressReason}
                  onCommit={(reason) => {
                    onLinkReasonCommit(link.id, reason);
                  }}
                />
                <LifeAreaGoalRelationSelect
                  goals={goals}
                  value={link.goalId}
                  onChange={(goalId) => {
                    onSetAssetGoalId('link', link.id, goalId);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('you.lifeArea.assets.deleteConfirmTitle')}
        description={t('you.lifeArea.assets.deleteConfirmDescription', {
          item: pendingDelete?.label ?? '',
        })}
        confirmLabel={t('you.lifeArea.assets.deleteConfirmAction')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(null);
        }}
      />
    </section>
  );
}

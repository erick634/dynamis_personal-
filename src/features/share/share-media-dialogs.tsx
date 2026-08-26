import { ExternalLink, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ShareCommentForm, ShareCommentList } from '@/features/share/share-comment-ui';
import type { LifeAreaShareComment } from '@/features/share/life-area-share-types';

type ShareImageLightboxProps = {
  open: boolean;
  name: string;
  dataUrl: string;
  comments: LifeAreaShareComment[];
  onClose: () => void;
  onSubmitComment: (input: { authorName: string; body: string }) => Promise<void>;
};

export function ShareImageLightbox({
  open,
  name,
  dataUrl,
  comments,
  onClose,
  onSubmitComment,
}: ShareImageLightboxProps) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="grid max-h-[92vh] w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-elevated md:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="relative flex min-h-[40vh] items-center justify-center bg-bg-deep p-3">
          <img src={dataUrl} alt={name} className="max-h-[80vh] w-full object-contain" />
        </div>
        <div className="flex max-h-[92vh] flex-col overflow-y-auto border-t border-line-soft p-4 md:border-t-0 md:border-l">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-body text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
                {t('share.lifeArea.lightbox.eyebrow')}
              </p>
              <h2 className="mt-1 truncate font-display text-lg font-semibold text-ink">{name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-3 hover:bg-bg-deep-cream hover:text-ink"
              aria-label={t('share.lifeArea.lightbox.close')}
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-4">
            <ShareCommentList
              comments={comments}
              emptyLabel={t('share.lifeArea.comments.emptyAsset')}
            />
            <ShareCommentForm
              onSubmit={onSubmitComment}
              submitLabel={t('share.lifeArea.comments.submit')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type ShareDocumentCommentDialogProps = {
  open: boolean;
  name: string;
  url: string;
  comments: LifeAreaShareComment[];
  onClose: () => void;
  onSubmitComment: (input: { authorName: string; body: string }) => Promise<void>;
};

export function ShareDocumentCommentDialog({
  open,
  name,
  url,
  comments,
  onClose,
  onSubmitComment,
}: ShareDocumentCommentDialogProps) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-soft"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              {t('share.lifeArea.document.eyebrow')}
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold text-ink">{name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-3 hover:bg-bg-deep-cream hover:text-ink"
            aria-label={t('share.lifeArea.lightbox.close')}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 font-body text-sm font-semibold text-blue hover:underline"
        >
          {t('share.lifeArea.document.open')}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>

        <div className="mt-5 space-y-4">
          <ShareCommentList
            comments={comments}
            emptyLabel={t('share.lifeArea.comments.emptyAsset')}
          />
          <ShareCommentForm
            onSubmit={onSubmitComment}
            submitLabel={t('share.lifeArea.comments.submit')}
          />
        </div>
      </div>
    </div>
  );
}

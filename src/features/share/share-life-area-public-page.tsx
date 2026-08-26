import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import {
  fetchPublicLifeAreaShare,
  fetchPublicLifeAreaShareComments,
  LifeAreaShareNotFoundError,
  postPublicLifeAreaShareComment,
} from '@/features/share/life-area-share-api';
import { ShareCommentForm, ShareCommentList } from '@/features/share/share-comment-ui';
import {
  ShareDocumentCommentDialog,
  ShareImageLightbox,
} from '@/features/share/share-media-dialogs';
import {
  LifeAreaShareShell,
  LifeAreaShareSuccess,
} from '@/features/share/share-life-area-public-view';

export function ShareLifeAreaPublicPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const shareToken = (token ?? '').trim();
  const queryClient = useQueryClient();
  const [openImageId, setOpenImageId] = useState<string | null>(null);
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);

  const shareQuery = useQuery({
    queryKey: ['public-life-area-share', shareToken],
    queryFn: () => fetchPublicLifeAreaShare(shareToken),
    enabled: shareToken.length > 0,
    retry: false,
  });

  const commentsQuery = useQuery({
    queryKey: ['public-life-area-share-comments', shareToken],
    queryFn: () => fetchPublicLifeAreaShareComments(shareToken),
    enabled: shareToken.length > 0,
    retry: false,
  });

  const postMutation = useMutation({
    mutationFn: postPublicLifeAreaShareComment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['public-life-area-share-comments', shareToken],
      });
    },
  });

  const comments = useMemo(() => commentsQuery.data ?? [], [commentsQuery.data]);
  const profileComments = useMemo(
    () => comments.filter((item) => item.target_type === 'profile'),
    [comments],
  );

  const openImage = shareQuery.data?.payload.images.find((image) => image.id === openImageId);
  const openDocument = shareQuery.data?.payload.documents.find((doc) => doc.id === openDocumentId);
  const imageComments = useMemo(
    () =>
      comments.filter((item) => item.target_type === 'image' && item.target_key === openImageId),
    [comments, openImageId],
  );
  const documentComments = useMemo(
    () =>
      comments.filter(
        (item) => item.target_type === 'document' && item.target_key === openDocumentId,
      ),
    [comments, openDocumentId],
  );

  if (
    !shareToken ||
    (shareQuery.isError && shareQuery.error instanceof LifeAreaShareNotFoundError)
  ) {
    return (
      <LifeAreaShareShell>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          {t('share.lifeArea.unavailableTitle')}
        </h1>
        <p className="mt-4 font-body text-base leading-relaxed text-ink-2">
          {t('share.lifeArea.unavailableBody')}
        </p>
      </LifeAreaShareShell>
    );
  }

  if (shareQuery.isLoading) {
    return (
      <LifeAreaShareShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="font-body text-sm text-ink-3">{t('share.lifeArea.loading')}</p>
        </div>
      </LifeAreaShareShell>
    );
  }

  if (shareQuery.isError || !shareQuery.data) {
    return (
      <LifeAreaShareShell>
        <h1 className="font-display text-3xl font-semibold">{t('share.lifeArea.errorTitle')}</h1>
        <p className="mt-4 font-body text-sm text-ink-2">
          {shareQuery.error instanceof Error
            ? shareQuery.error.message
            : t('share.lifeArea.errorBody')}
        </p>
      </LifeAreaShareShell>
    );
  }

  return (
    <LifeAreaShareShell>
      <LifeAreaShareSuccess
        data={shareQuery.data.payload}
        onOpenImage={setOpenImageId}
        onOpenDocument={setOpenDocumentId}
        profileCommentsSlot={
          <div className="space-y-4">
            <ShareCommentList
              comments={profileComments}
              emptyLabel={t('share.lifeArea.comments.emptyProfile')}
            />
            <ShareCommentForm
              submitLabel={t('share.lifeArea.comments.submit')}
              onSubmit={async ({ authorName, body }) => {
                await postMutation.mutateAsync({
                  token: shareToken,
                  authorName,
                  body,
                  targetType: 'profile',
                });
              }}
            />
          </div>
        }
      />

      <ShareImageLightbox
        open={openImage != null}
        name={openImage?.name ?? ''}
        dataUrl={openImage?.dataUrl ?? ''}
        comments={imageComments}
        onClose={() => {
          setOpenImageId(null);
        }}
        onSubmitComment={async ({ authorName, body }) => {
          if (!openImageId) return;
          await postMutation.mutateAsync({
            token: shareToken,
            authorName,
            body,
            targetType: 'image',
            targetKey: openImageId,
          });
        }}
      />

      <ShareDocumentCommentDialog
        open={openDocument != null}
        name={openDocument?.name ?? ''}
        url={openDocument?.url ?? ''}
        comments={documentComments}
        onClose={() => {
          setOpenDocumentId(null);
        }}
        onSubmitComment={async ({ authorName, body }) => {
          if (!openDocumentId) return;
          await postMutation.mutateAsync({
            token: shareToken,
            authorName,
            body,
            targetType: 'document',
            targetKey: openDocumentId,
          });
        }}
      />
    </LifeAreaShareShell>
  );
}

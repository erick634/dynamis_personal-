import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import { fetchOwnerLifeAreaShareComments } from '@/features/share/life-area-share-api';
import { ShareCommentList } from '@/features/share/share-comment-ui';
import { useDemoUserId } from '@/hooks/use-demo-user-id';

type LifeAreaShareCommentsPanelProps = {
  areaId: LifeAreaId;
};

export function LifeAreaShareCommentsPanel({ areaId }: LifeAreaShareCommentsPanelProps) {
  const { t } = useTranslation();
  const userId = useDemoUserId();

  const commentsQuery = useQuery({
    queryKey: ['owner-life-area-share-comments', userId, areaId],
    queryFn: () => fetchOwnerLifeAreaShareComments({ userId, areaId }),
  });

  const comments = commentsQuery.data ?? [];

  return (
    <section className="mt-6 rounded-2xl border border-line-soft/80 bg-bg/40 p-5">
      <h2 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-ink">
        <MessageCircle className="size-4 text-blue" aria-hidden />
        {t('you.lifeArea.shareComments.title')}
      </h2>
      <p className="mt-1 font-body text-xs text-ink-3">
        {t('you.lifeArea.shareComments.subtitle')}
      </p>

      <div className="mt-4">
        {commentsQuery.isLoading ? (
          <p className="font-body text-sm text-ink-3">{t('you.lifeArea.shareComments.loading')}</p>
        ) : commentsQuery.isError ? (
          <p className="font-body text-sm text-red" role="alert">
            {t('you.lifeArea.shareComments.error')}
          </p>
        ) : (
          <ShareCommentList
            comments={comments}
            emptyLabel={t('you.lifeArea.shareComments.empty')}
            showTarget
          />
        )}
      </div>
    </section>
  );
}

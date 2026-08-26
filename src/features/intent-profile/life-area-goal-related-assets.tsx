import { ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { GoalRelatedAssets } from '@/features/intent-profile/goal-related-assets';

type LifeAreaGoalRelatedAssetsProps = {
  assets: GoalRelatedAssets;
};

export function LifeAreaGoalRelatedAssets({ assets }: LifeAreaGoalRelatedAssetsProps) {
  const { t } = useTranslation();
  const total = assets.links.length + assets.documents.length + assets.images.length;

  return (
    <div className="mt-6">
      <p className="font-body text-xs font-semibold text-ink-3 uppercase">
        {t('you.lifeArea.growing.relatedEvidence')}
      </p>
      {total === 0 ? (
        <p className="mt-2 font-body text-sm text-ink-3">
          {t('you.lifeArea.growing.relatedEvidenceEmpty')}
        </p>
      ) : (
        <ul className="mt-2 list-none space-y-2 p-0">
          {assets.images.map((image) => (
            <li
              key={`image-${image.id}`}
              className="flex items-center gap-3 rounded-xl border border-line-soft bg-bg/40 px-3 py-2"
            >
              <img
                src={image.dataUrl}
                alt=""
                className="size-10 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="font-body text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
                  {t('you.lifeArea.assets.kindImage')}
                </p>
                <p className="truncate font-body text-sm text-ink">{image.name}</p>
              </div>
              <ImageIcon className="ml-auto size-3.5 shrink-0 text-ink-3" aria-hidden />
            </li>
          ))}
          {assets.documents.map((doc) => (
            <li key={`document-${doc.id}`}>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-line-soft bg-bg/40 px-3 py-2 hover:border-blue/40"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-soft/70 text-blue">
                  <FileText className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-body text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
                    {t('you.lifeArea.assets.kindDocument')}
                  </p>
                  <p className="truncate font-body text-sm text-ink">{doc.name}</p>
                </div>
              </a>
            </li>
          ))}
          {assets.links.map((link) => (
            <li key={`link-${link.id}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border border-line-soft bg-bg/40 px-3 py-2 hover:border-blue/40"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-soft/70 text-blue">
                  <ExternalLink className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-body text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
                    {t('you.lifeArea.assets.kindLink')}
                  </p>
                  <p className="truncate font-body text-sm text-ink">{link.label}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

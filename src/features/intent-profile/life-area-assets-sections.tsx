import { ExternalLink, FileText, ImagePlus } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { CollapsibleAssetSection } from '@/features/intent-profile/collapsible-asset-section';
import { LifeAreaGoalRelationSelect } from '@/features/intent-profile/life-area-goal-relation-select';
import { ProgressReasonInput } from '@/features/intent-profile/life-area-progress-reason';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';
import { MAX_LIFE_AREA_IMAGES } from '@/features/intent-profile/use-life-areas';

export { CollapsibleAssetSection } from '@/features/intent-profile/collapsible-asset-section';

export const lifeAreaAssetInputClass =
  'rounded-xl border border-line bg-white px-3 py-2 font-body text-sm outline-none focus:border-blue/50';

export function LinksSection({
  count,
  goals,
  linkLabel,
  linkUrl,
  linkReason,
  linkGoalId,
  setLinkLabel,
  setLinkUrl,
  setLinkReason,
  setLinkGoalId,
  onSubmit,
}: {
  count: number;
  goals: LifeAreaUserGoal[];
  linkLabel: string;
  linkUrl: string;
  linkReason: string;
  linkGoalId: string | null;
  setLinkLabel: (v: string) => void;
  setLinkUrl: (v: string) => void;
  setLinkReason: (v: string) => void;
  setLinkGoalId: (v: string | null) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const { t } = useTranslation();
  return (
    <CollapsibleAssetSection
      title={t('you.lifeArea.assets.addLink')}
      icon={<ExternalLink className="size-4 text-blue" aria-hidden />}
      count={count}
    >
      <form className="flex flex-col gap-2" onSubmit={onSubmit}>
        <input
          value={linkLabel}
          onChange={(e) => {
            setLinkLabel(e.target.value);
          }}
          placeholder={t('you.lifeArea.assets.linkLabel')}
          className={lifeAreaAssetInputClass}
        />
        <input
          value={linkUrl}
          onChange={(e) => {
            setLinkUrl(e.target.value);
          }}
          placeholder={t('you.lifeArea.assets.linkUrl')}
          className={lifeAreaAssetInputClass}
        />
        <ProgressReasonInput value={linkReason} onChange={setLinkReason} />
        <LifeAreaGoalRelationSelect goals={goals} value={linkGoalId} onChange={setLinkGoalId} />
        <button
          type="submit"
          className="self-start rounded-full bg-blue px-3 py-1.5 font-body text-xs font-semibold text-white"
        >
          {t('you.lifeArea.assets.saveLink')}
        </button>
      </form>
    </CollapsibleAssetSection>
  );
}

export function DocumentsSection({
  count,
  goals,
  docName,
  docUrl,
  docReason,
  docGoalId,
  setDocName,
  setDocUrl,
  setDocReason,
  setDocGoalId,
  onSubmit,
}: {
  count: number;
  goals: LifeAreaUserGoal[];
  docName: string;
  docUrl: string;
  docReason: string;
  docGoalId: string | null;
  setDocName: (v: string) => void;
  setDocUrl: (v: string) => void;
  setDocReason: (v: string) => void;
  setDocGoalId: (v: string | null) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const { t } = useTranslation();
  return (
    <CollapsibleAssetSection
      title={t('you.lifeArea.assets.addDocument')}
      icon={<FileText className="size-4 text-blue" aria-hidden />}
      count={count}
    >
      <form className="flex flex-col gap-2" onSubmit={onSubmit}>
        <input
          value={docName}
          onChange={(e) => {
            setDocName(e.target.value);
          }}
          placeholder={t('you.lifeArea.assets.documentName')}
          className={lifeAreaAssetInputClass}
        />
        <input
          value={docUrl}
          onChange={(e) => {
            setDocUrl(e.target.value);
          }}
          placeholder={t('you.lifeArea.assets.documentUrl')}
          className={lifeAreaAssetInputClass}
        />
        <ProgressReasonInput value={docReason} onChange={setDocReason} />
        <LifeAreaGoalRelationSelect goals={goals} value={docGoalId} onChange={setDocGoalId} />
        <button
          type="submit"
          className="self-start rounded-full bg-blue px-3 py-1.5 font-body text-xs font-semibold text-white"
        >
          {t('you.lifeArea.assets.saveDocument')}
        </button>
      </form>
    </CollapsibleAssetSection>
  );
}

export function ImagesSection({
  count,
  goals,
  imageReason,
  imageGoalId,
  imageError,
  setImageReason,
  setImageGoalId,
  onImageChange,
}: {
  count: number;
  goals: LifeAreaUserGoal[];
  imageReason: string;
  imageGoalId: string | null;
  imageError: string | null;
  setImageReason: (v: string) => void;
  setImageGoalId: (v: string | null) => void;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const { t } = useTranslation();
  return (
    <CollapsibleAssetSection
      title={t('you.lifeArea.assets.addImage')}
      icon={<ImagePlus className="size-4 text-blue" aria-hidden />}
      count={count}
    >
      <p className="font-body text-xs text-ink-3">
        {t('you.lifeArea.assets.imagesHint', { max: MAX_LIFE_AREA_IMAGES })}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <ProgressReasonInput value={imageReason} onChange={setImageReason} />
        <LifeAreaGoalRelationSelect goals={goals} value={imageGoalId} onChange={setImageGoalId} />
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 font-body text-xs font-semibold text-blue hover:bg-blue-soft/50">
          <input type="file" accept="image/*" className="sr-only" onChange={onImageChange} />
          {t('you.lifeArea.assets.chooseImage')}
        </label>
      </div>
      {imageError ? (
        <p className="mt-2 font-body text-xs text-ember" role="alert">
          {imageError}
        </p>
      ) : null}
    </CollapsibleAssetSection>
  );
}

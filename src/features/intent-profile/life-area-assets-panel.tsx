import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { LifeAreaAssetsGallery } from '@/features/intent-profile/life-area-assets-gallery';
import {
  DocumentsSection,
  ImagesSection,
  LinksSection,
} from '@/features/intent-profile/life-area-assets-sections';
import { generateLifeAreaMotto } from '@/features/intent-profile/life-area-motto-api';
import {
  collectMottoEvidence,
  hasProgressReasons,
} from '@/features/intent-profile/life-area-motto-evidence';
import type { LifeAreaId } from '@/features/intent-profile/life-area-scores';
import {
  MAX_IMAGE_BYTES,
  MAX_LIFE_AREA_IMAGES,
  useLifeAreas,
} from '@/features/intent-profile/use-life-areas';
import { useLifeAreaGoals } from '@/features/intent-profile/use-life-area-goals';
import type { LifeAreaUserGoal } from '@/features/intent-profile/life-area-goals-types';
import { useDemoUserId } from '@/hooks/use-demo-user-id';

const EMPTY_GOALS: LifeAreaUserGoal[] = [];

type LifeAreaAssetsPanelProps = {
  areaId: LifeAreaId;
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function LifeAreaAssetsPanel({ areaId }: LifeAreaAssetsPanelProps) {
  const { t, i18n } = useTranslation();
  const userId = useDemoUserId();
  const content = useLifeAreas((state) => state.getContent(areaId));
  const goals = useLifeAreaGoals((state) => state.goalsByArea[areaId] ?? EMPTY_GOALS);
  const setMotivationalPhrase = useLifeAreas((state) => state.setMotivationalPhrase);
  const addLink = useLifeAreas((state) => state.addLink);
  const removeLink = useLifeAreas((state) => state.removeLink);
  const addDocument = useLifeAreas((state) => state.addDocument);
  const removeDocument = useLifeAreas((state) => state.removeDocument);
  const addImage = useLifeAreas((state) => state.addImage);
  const removeImage = useLifeAreas((state) => state.removeImage);
  const setLinkProgressReason = useLifeAreas((state) => state.setLinkProgressReason);
  const setDocumentProgressReason = useLifeAreas((state) => state.setDocumentProgressReason);
  const setImageProgressReason = useLifeAreas((state) => state.setImageProgressReason);
  const setAssetGoalId = useLifeAreas((state) => state.setAssetGoalId);

  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkReason, setLinkReason] = useState('');
  const [linkGoalId, setLinkGoalId] = useState<string | null>(null);
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docReason, setDocReason] = useState('');
  const [docGoalId, setDocGoalId] = useState<string | null>(null);
  const [imageReason, setImageReason] = useState('');
  const [imageGoalId, setImageGoalId] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const areaLabel = t(`you.balanceRadar.areas.${areaId}`);

  const regenerateMotto = async () => {
    const latest = useLifeAreas.getState().getContent(areaId);
    const evidence = collectMottoEvidence(latest);
    if (evidence.length === 0 || !hasProgressReasons(latest)) {
      setMotivationalPhrase(areaId, '');
      return;
    }
    const phrase = await generateLifeAreaMotto({
      userId,
      areaId,
      areaLabel,
      locale: i18n.language || 'en-US',
      evidence,
    });
    if (phrase) {
      setMotivationalPhrase(areaId, phrase);
    }
  };

  const handleAddLink = (event: FormEvent) => {
    event.preventDefault();
    const label = linkLabel.trim();
    const url = normalizeUrl(linkUrl);
    if (!label || !url) return;
    addLink(areaId, {
      label,
      url,
      progressReason: linkReason.trim(),
      goalId: linkGoalId,
    });
    setLinkLabel('');
    setLinkUrl('');
    setLinkReason('');
    setLinkGoalId(null);
    void regenerateMotto();
  };

  const handleAddDocument = (event: FormEvent) => {
    event.preventDefault();
    const name = docName.trim();
    const url = normalizeUrl(docUrl);
    if (!name || !url) return;
    addDocument(areaId, {
      name,
      url,
      progressReason: docReason.trim(),
      goalId: docGoalId,
    });
    setDocName('');
    setDocUrl('');
    setDocReason('');
    setDocGoalId(null);
    void regenerateMotto();
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setImageError(null);
    if (!file) return;
    if (content.images.length >= MAX_LIFE_AREA_IMAGES) {
      setImageError(t('you.lifeArea.assets.imageLimit', { max: MAX_LIFE_AREA_IMAGES }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(t('you.lifeArea.assets.imageTooLarge'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      setImageError(t('you.lifeArea.assets.imageInvalid'));
      return;
    }
    const reason = imageReason.trim();
    const relatedGoalId = imageGoalId;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      addImage(areaId, {
        name: file.name,
        dataUrl: reader.result,
        progressReason: reason,
        goalId: relatedGoalId,
      });
      setImageReason('');
      setImageGoalId(null);
      void regenerateMotto();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <LinksSection
          count={content.links.length}
          goals={goals}
          linkLabel={linkLabel}
          linkUrl={linkUrl}
          linkReason={linkReason}
          linkGoalId={linkGoalId}
          setLinkLabel={setLinkLabel}
          setLinkUrl={setLinkUrl}
          setLinkReason={setLinkReason}
          setLinkGoalId={setLinkGoalId}
          onSubmit={handleAddLink}
        />

        <DocumentsSection
          count={content.documents.length}
          goals={goals}
          docName={docName}
          docUrl={docUrl}
          docReason={docReason}
          docGoalId={docGoalId}
          setDocName={setDocName}
          setDocUrl={setDocUrl}
          setDocReason={setDocReason}
          setDocGoalId={setDocGoalId}
          onSubmit={handleAddDocument}
        />

        <ImagesSection
          count={content.images.length}
          goals={goals}
          imageReason={imageReason}
          imageGoalId={imageGoalId}
          imageError={imageError}
          setImageReason={setImageReason}
          setImageGoalId={setImageGoalId}
          onImageChange={handleImageChange}
        />
      </div>

      <LifeAreaAssetsGallery
        content={content}
        goals={goals}
        onRemoveLink={(linkId) => {
          removeLink(areaId, linkId);
          void regenerateMotto();
        }}
        onRemoveDocument={(documentId) => {
          removeDocument(areaId, documentId);
          void regenerateMotto();
        }}
        onRemoveImage={(imageId) => {
          removeImage(areaId, imageId);
          void regenerateMotto();
        }}
        onLinkReasonCommit={(linkId, reason) => {
          setLinkProgressReason(areaId, linkId, reason);
          void regenerateMotto();
        }}
        onDocumentReasonCommit={(documentId, reason) => {
          setDocumentProgressReason(areaId, documentId, reason);
          void regenerateMotto();
        }}
        onImageReasonCommit={(imageId, reason) => {
          setImageProgressReason(areaId, imageId, reason);
          void regenerateMotto();
        }}
        onSetAssetGoalId={(kind, assetId, goalId) => {
          setAssetGoalId(areaId, kind, assetId, goalId);
        }}
      />
    </div>
  );
}

import { LIFE_AREA_IDS, type LifeAreaId } from '@/features/intent-profile/life-area-scores';

export type LifeAreaLink = {
  id: string;
  label: string;
  url: string;
  progressReason: string;
  goalId: string | null;
};

export type LifeAreaDocument = {
  id: string;
  name: string;
  url: string;
  progressReason: string;
  goalId: string | null;
};

export type LifeAreaImage = {
  id: string;
  name: string;
  dataUrl: string;
  progressReason: string;
  goalId: string | null;
};

export type LifeAreaContent = {
  summary: string;
  motivationalPhrase: string;
  links: LifeAreaLink[];
  documents: LifeAreaDocument[];
  images: LifeAreaImage[];
};

export const EMPTY_LIFE_AREA_CONTENT: LifeAreaContent = {
  summary: '',
  motivationalPhrase: '',
  links: [],
  documents: [],
  images: [],
};

function asProgressReason(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asGoalId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function isLifeAreaId(value: string): value is LifeAreaId {
  return (LIFE_AREA_IDS as readonly string[]).includes(value);
}

export function parseLifeAreaContent(value: unknown): LifeAreaContent | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const summary = typeof record.summary === 'string' ? record.summary : '';
  const phrase = typeof record.motivationalPhrase === 'string' ? record.motivationalPhrase : '';
  const links = Array.isArray(record.links)
    ? record.links.flatMap((item): LifeAreaLink[] => {
        if (!item || typeof item !== 'object') return [];
        const row = item as LifeAreaLink;
        if (
          typeof row.id !== 'string' ||
          typeof row.label !== 'string' ||
          typeof row.url !== 'string'
        ) {
          return [];
        }
        return [
          {
            ...row,
            progressReason: asProgressReason(row.progressReason),
            goalId: asGoalId(row.goalId),
          },
        ];
      })
    : [];
  const documents = Array.isArray(record.documents)
    ? record.documents.flatMap((item): LifeAreaDocument[] => {
        if (!item || typeof item !== 'object') return [];
        const row = item as LifeAreaDocument;
        if (
          typeof row.id !== 'string' ||
          typeof row.name !== 'string' ||
          typeof row.url !== 'string'
        ) {
          return [];
        }
        return [
          {
            ...row,
            progressReason: asProgressReason(row.progressReason),
            goalId: asGoalId(row.goalId),
          },
        ];
      })
    : [];
  const images = Array.isArray(record.images)
    ? record.images.flatMap((item): LifeAreaImage[] => {
        if (!item || typeof item !== 'object') return [];
        const row = item as LifeAreaImage;
        if (
          typeof row.id !== 'string' ||
          typeof row.name !== 'string' ||
          typeof row.dataUrl !== 'string'
        ) {
          return [];
        }
        return [
          {
            ...row,
            progressReason: asProgressReason(row.progressReason),
            goalId: asGoalId(row.goalId),
          },
        ];
      })
    : [];
  return { summary, motivationalPhrase: phrase, links, documents, images };
}

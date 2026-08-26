import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  EMPTY_LIFE_AREA_CONTENT,
  isLifeAreaId,
  parseLifeAreaContent,
  type LifeAreaContent,
  type LifeAreaDocument,
  type LifeAreaImage,
  type LifeAreaLink,
} from '@/features/intent-profile/life-area-content';
import { LIFE_AREA_IDS, type LifeAreaId } from '@/features/intent-profile/life-area-scores';

export type {
  LifeAreaContent,
  LifeAreaDocument,
  LifeAreaImage,
  LifeAreaLink,
} from '@/features/intent-profile/life-area-content';
export { EMPTY_LIFE_AREA_CONTENT } from '@/features/intent-profile/life-area-content';

type LifeAreasState = {
  activeAreaIds: LifeAreaId[];
  contentByArea: Partial<Record<LifeAreaId, LifeAreaContent>>;
  addArea: (id: LifeAreaId) => void;
  removeArea: (id: LifeAreaId) => void;
  isActive: (id: LifeAreaId) => boolean;
  getContent: (id: LifeAreaId) => LifeAreaContent;
  setSummary: (id: LifeAreaId, summary: string) => void;
  setMotivationalPhrase: (id: LifeAreaId, phrase: string) => void;
  addLink: (id: LifeAreaId, link: Omit<LifeAreaLink, 'id'>) => void;
  removeLink: (id: LifeAreaId, linkId: string) => void;
  addDocument: (id: LifeAreaId, document: Omit<LifeAreaDocument, 'id'>) => void;
  removeDocument: (id: LifeAreaId, documentId: string) => void;
  addImage: (id: LifeAreaId, image: Omit<LifeAreaImage, 'id'>) => void;
  removeImage: (id: LifeAreaId, imageId: string) => void;
  setLinkProgressReason: (id: LifeAreaId, linkId: string, reason: string) => void;
  setDocumentProgressReason: (id: LifeAreaId, documentId: string, reason: string) => void;
  setImageProgressReason: (id: LifeAreaId, imageId: string, reason: string) => void;
  setAssetGoalId: (
    id: LifeAreaId,
    kind: 'link' | 'document' | 'image',
    assetId: string,
    goalId: string | null,
  ) => void;
  clearGoalRelations: (id: LifeAreaId, goalId: string) => void;
};

export const MAX_LIFE_AREA_IMAGES = 4;
export const MAX_IMAGE_BYTES = 400_000;

function newId(): string {
  return crypto.randomUUID();
}

function ensureContent(
  map: Partial<Record<LifeAreaId, LifeAreaContent>>,
  id: LifeAreaId,
): LifeAreaContent {
  return map[id] ?? EMPTY_LIFE_AREA_CONTENT;
}

function blankContent(): LifeAreaContent {
  return { summary: '', motivationalPhrase: '', links: [], documents: [], images: [] };
}

function updateContent(
  map: Partial<Record<LifeAreaId, LifeAreaContent>>,
  id: LifeAreaId,
  updater: (current: LifeAreaContent) => LifeAreaContent,
): Partial<Record<LifeAreaId, LifeAreaContent>> {
  const current = map[id] ?? blankContent();
  return { ...map, [id]: updater(current) };
}

export const useLifeAreas = create<LifeAreasState>()(
  persist(
    (set, get) => ({
      activeAreaIds: [...LIFE_AREA_IDS],
      contentByArea: {},
      addArea: (id) => {
        set((state) => {
          if (state.activeAreaIds.includes(id)) return state;
          return { activeAreaIds: [...state.activeAreaIds, id] };
        });
      },
      removeArea: (id) => {
        set((state) => ({
          activeAreaIds: state.activeAreaIds.filter((areaId) => areaId !== id),
        }));
      },
      isActive: (id) => get().activeAreaIds.includes(id),
      getContent: (id) => ensureContent(get().contentByArea, id),
      setSummary: (id, summary) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => ({
            ...current,
            summary,
          })),
        }));
      },
      setMotivationalPhrase: (id, phrase) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => ({
            ...current,
            motivationalPhrase: phrase,
          })),
        }));
      },
      addLink: (id, link) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => ({
            ...current,
            links: [...current.links, { ...link, id: newId() }],
          })),
        }));
      },
      removeLink: (id, linkId) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => ({
            ...current,
            links: current.links.filter((item) => item.id !== linkId),
          })),
        }));
      },
      addDocument: (id, document) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => ({
            ...current,
            documents: [...current.documents, { ...document, id: newId() }],
          })),
        }));
      },
      removeDocument: (id, documentId) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => ({
            ...current,
            documents: current.documents.filter((item) => item.id !== documentId),
          })),
        }));
      },
      addImage: (id, image) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => {
            if (current.images.length >= MAX_LIFE_AREA_IMAGES) return current;
            return {
              ...current,
              images: [...current.images, { ...image, id: newId() }],
            };
          }),
        }));
      },
      removeImage: (id, imageId) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => ({
            ...current,
            images: current.images.filter((item) => item.id !== imageId),
          })),
        }));
      },
      setLinkProgressReason: (id, linkId, reason) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => ({
            ...current,
            links: current.links.map((item) =>
              item.id === linkId ? { ...item, progressReason: reason } : item,
            ),
          })),
        }));
      },
      setDocumentProgressReason: (id, documentId, reason) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => ({
            ...current,
            documents: current.documents.map((item) =>
              item.id === documentId ? { ...item, progressReason: reason } : item,
            ),
          })),
        }));
      },
      setImageProgressReason: (id, imageId, reason) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => ({
            ...current,
            images: current.images.map((item) =>
              item.id === imageId ? { ...item, progressReason: reason } : item,
            ),
          })),
        }));
      },
      setAssetGoalId: (id, kind, assetId, goalId) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => {
            if (kind === 'link') {
              return {
                ...current,
                links: current.links.map((item) =>
                  item.id === assetId ? { ...item, goalId } : item,
                ),
              };
            }
            if (kind === 'document') {
              return {
                ...current,
                documents: current.documents.map((item) =>
                  item.id === assetId ? { ...item, goalId } : item,
                ),
              };
            }
            return {
              ...current,
              images: current.images.map((item) =>
                item.id === assetId ? { ...item, goalId } : item,
              ),
            };
          }),
        }));
      },
      clearGoalRelations: (id, goalId) => {
        set((state) => ({
          contentByArea: updateContent(state.contentByArea, id, (current) => ({
            ...current,
            links: current.links.map((item) =>
              item.goalId === goalId ? { ...item, goalId: null } : item,
            ),
            documents: current.documents.map((item) =>
              item.goalId === goalId ? { ...item, goalId: null } : item,
            ),
            images: current.images.map((item) =>
              item.goalId === goalId ? { ...item, goalId: null } : item,
            ),
          })),
        }));
      },
    }),
    {
      name: 'dynamis-life-areas',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeAreaIds: state.activeAreaIds,
        contentByArea: state.contentByArea,
      }),
      merge: (persisted, current) => {
        const raw = persisted as { activeAreaIds?: unknown; contentByArea?: unknown } | undefined;
        const ids = Array.isArray(raw?.activeAreaIds)
          ? raw.activeAreaIds.filter(
              (id): id is LifeAreaId => typeof id === 'string' && isLifeAreaId(id),
            )
          : current.activeAreaIds;

        const contentByArea: Partial<Record<LifeAreaId, LifeAreaContent>> = {};
        if (raw?.contentByArea && typeof raw.contentByArea === 'object') {
          for (const [key, value] of Object.entries(raw.contentByArea)) {
            if (!isLifeAreaId(key)) continue;
            const parsed = parseLifeAreaContent(value);
            if (parsed) contentByArea[key] = parsed;
          }
        }

        return { ...current, activeAreaIds: ids, contentByArea };
      },
    },
  ),
);

export function parseLifeAreaId(value: string | undefined): LifeAreaId | null {
  if (!value || !isLifeAreaId(value)) return null;
  return value;
}

export function countAreaAssets(content: LifeAreaContent): number {
  return content.links.length + content.documents.length + content.images.length;
}

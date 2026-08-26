import type {
  LifeAreaDocument,
  LifeAreaImage,
  LifeAreaLink,
} from '@/features/intent-profile/use-life-areas';

export type GoalRelatedAssets = {
  links: LifeAreaLink[];
  documents: LifeAreaDocument[];
  images: LifeAreaImage[];
};

export function assetsForGoal(
  content: {
    links: LifeAreaLink[];
    documents: LifeAreaDocument[];
    images: LifeAreaImage[];
  },
  goalId: string,
): GoalRelatedAssets {
  return {
    links: content.links.filter((item) => item.goalId === goalId),
    documents: content.documents.filter((item) => item.goalId === goalId),
    images: content.images.filter((item) => item.goalId === goalId),
  };
}

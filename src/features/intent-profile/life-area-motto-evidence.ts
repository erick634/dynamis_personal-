import type { LifeAreaContent } from '@/features/intent-profile/use-life-areas';

export type LifeAreaMottoEvidence = {
  kind: 'link' | 'document' | 'image';
  title: string;
  progressReason: string;
};

export function collectMottoEvidence(content: LifeAreaContent): LifeAreaMottoEvidence[] {
  const evidence: LifeAreaMottoEvidence[] = [];
  for (const link of content.links) {
    evidence.push({
      kind: 'link',
      title: link.label,
      progressReason: link.progressReason.trim(),
    });
  }
  for (const document of content.documents) {
    evidence.push({
      kind: 'document',
      title: document.name,
      progressReason: document.progressReason.trim(),
    });
  }
  for (const image of content.images) {
    evidence.push({
      kind: 'image',
      title: image.name,
      progressReason: image.progressReason.trim(),
    });
  }
  return evidence;
}

export function hasProgressReasons(content: LifeAreaContent): boolean {
  return collectMottoEvidence(content).some((item) => item.progressReason.length > 0);
}

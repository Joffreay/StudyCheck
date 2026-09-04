/** Longueur minimale du titre normalisé pour éviter les faux positifs. */
export const MIN_NORMALIZED_TITLE_LENGTH = 15;

export type TitleClusterReference = {
  id: string;
  titleNormalized: string;
  duplicateGroupId: string | null;
  duplicateGroupStatus?: "OPEN" | "MERGED" | "DISMISSED" | null;
};

export function isEligibleTitleForDuplicateDetection(titleNormalized: string): boolean {
  return titleNormalized.trim().length >= MIN_NORMALIZED_TITLE_LENGTH;
}

export function clusterReferencesByNormalizedTitle<T extends TitleClusterReference>(
  references: T[],
): Map<string, T[]> {
  const clusters = new Map<string, T[]>();

  for (const reference of references) {
    if (!isEligibleTitleForDuplicateDetection(reference.titleNormalized)) continue;

    const bucket = clusters.get(reference.titleNormalized) ?? [];
    bucket.push(reference);
    clusters.set(reference.titleNormalized, bucket);
  }

  return clusters;
}

export function filterDuplicateClusters<T extends TitleClusterReference>(
  clusters: Map<string, T[]>,
): Array<{ titleNormalized: string; references: T[] }> {
  const results: Array<{ titleNormalized: string; references: T[] }> = [];

  for (const [titleNormalized, references] of clusters) {
    if (references.length < 2) continue;
    results.push({ titleNormalized, references });
  }

  return results.sort((a, b) => b.references.length - a.references.length);
}

export function shouldCreateDuplicateGroup(references: TitleClusterReference[]): boolean {
  const openGroupIds = new Set(
    references
      .filter((reference) => reference.duplicateGroupStatus === "OPEN" && reference.duplicateGroupId)
      .map((reference) => reference.duplicateGroupId as string),
  );

  if (openGroupIds.size === 1 && references.every((reference) => reference.duplicateGroupId)) {
    return false;
  }

  return references.some((reference) => !reference.duplicateGroupId || reference.duplicateGroupStatus !== "OPEN");
}

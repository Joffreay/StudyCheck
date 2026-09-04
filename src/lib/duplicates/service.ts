import { prisma } from "@/lib/db";
import {
  clusterReferencesByNormalizedTitle,
  filterDuplicateClusters,
  shouldCreateDuplicateGroup,
} from "@/lib/duplicates/title-detection";
import { mergeReferenceFields, pickPrimaryReferenceId, type MergeableReference } from "@/lib/references/merge-fields";
import { buildInfoGapFlags, computeInfoCompleteness } from "@/lib/references/normalize";
import { AuditAction, DuplicateGroupStatus, Prisma } from "@prisma/client";

export type DuplicateGroupSummary = {
  id: string;
  status: DuplicateGroupStatus;
  matchReason: string;
  similarity: number | null;
  createdAt: string;
  resolvedAt: string | null;
  title: string;
  titleNormalized: string;
  referenceCount: number;
  references: Array<{
    id: string;
    title: string;
    year: number | null;
    doi: string | null;
    pmid: string | null;
    sourceCount: number;
    sourceDatabases: string[];
    infoCompleteness: number;
  }>;
};

export type DetectTitleDuplicatesResult = {
  clustersFound: number;
  groupsCreated: number;
  groupsUpdated: number;
  openGroups: number;
};

function buildCompletenessUpdate(reference: {
  abstract: string | null;
  keywords: string[];
  meshTerms: string[];
  doi: string | null;
  pmid: string | null;
}) {
  const hasAbstract = Boolean(reference.abstract?.trim());
  const keywordsCount = reference.keywords.length;
  const meshCount = reference.meshTerms.length;

  return {
    hasAbstract,
    infoCompleteness: computeInfoCompleteness({
      hasAbstract,
      keywordsCount,
      meshCount,
      hasDoi: Boolean(reference.doi),
      hasPmid: Boolean(reference.pmid),
    }),
    infoGapFlags: buildInfoGapFlags({ hasAbstract, keywordsCount, meshCount }),
  };
}

export async function detectTitleDuplicates(projectId: string): Promise<DetectTitleDuplicatesResult> {
  const references = await prisma.reference.findMany({
    where: { projectId, isCanonical: true, mergedIntoId: null },
    select: {
      id: true,
      titleNormalized: true,
      duplicateGroupId: true,
      duplicateGroup: { select: { status: true } },
    },
  });

  const enriched = references.map((reference) => ({
    id: reference.id,
    titleNormalized: reference.titleNormalized,
    duplicateGroupId: reference.duplicateGroupId,
    duplicateGroupStatus: reference.duplicateGroup?.status ?? null,
  }));

  const clusters = filterDuplicateClusters(clusterReferencesByNormalizedTitle(enriched));
  let groupsCreated = 0;
  let groupsUpdated = 0;

  for (const cluster of clusters) {
    if (!shouldCreateDuplicateGroup(cluster.references)) continue;

    const referenceIds = cluster.references.map((reference) => reference.id);
    const existingOpenGroupId = cluster.references.find(
      (reference) => reference.duplicateGroupStatus === "OPEN" && reference.duplicateGroupId,
    )?.duplicateGroupId;

    if (existingOpenGroupId) {
      await prisma.reference.updateMany({
        where: {
          id: { in: referenceIds },
          OR: [{ duplicateGroupId: null }, { duplicateGroupId: { not: existingOpenGroupId } }],
        },
        data: { duplicateGroupId: existingOpenGroupId },
      });
      groupsUpdated += 1;
      continue;
    }

    const group = await prisma.duplicateGroup.create({
      data: {
        projectId,
        status: DuplicateGroupStatus.OPEN,
        matchReason: "title_normalized_exact",
        similarity: 1,
      },
    });

    await prisma.reference.updateMany({
      where: { id: { in: referenceIds } },
      data: { duplicateGroupId: group.id },
    });

    groupsCreated += 1;
  }

  const openGroups = await prisma.duplicateGroup.count({
    where: { projectId, status: DuplicateGroupStatus.OPEN },
  });

  return {
    clustersFound: clusters.length,
    groupsCreated,
    groupsUpdated,
    openGroups,
  };
}

export async function countOpenDuplicateGroups(projectId: string): Promise<number> {
  const eligibleIds = await getEligibleDuplicateGroupIds(projectId, DuplicateGroupStatus.OPEN);
  return eligibleIds.length;
}

async function getEligibleDuplicateGroupIds(
  projectId: string,
  status: DuplicateGroupStatus,
): Promise<string[]> {
  const groups = await prisma.duplicateGroup.findMany({
    where: { projectId, status },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      _count: {
        select: {
          references: {
            where: { isCanonical: true, mergedIntoId: null },
          },
        },
      },
    },
  });

  return groups.filter((group) => group._count.references >= 2).map((group) => group.id);
}

export async function listDuplicateGroups(
  projectId: string,
  status: DuplicateGroupStatus = DuplicateGroupStatus.OPEN,
  limit = 25,
  offset = 0,
): Promise<{ groups: DuplicateGroupSummary[]; total: number; limit: number; offset: number }> {
  const eligibleIds = await getEligibleDuplicateGroupIds(projectId, status);
  const total = eligibleIds.length;
  const pageIds = eligibleIds.slice(offset, offset + limit);

  if (pageIds.length === 0) {
    return { groups: [], total, limit, offset };
  }

  const groups = await prisma.duplicateGroup.findMany({
    where: { id: { in: pageIds } },
    orderBy: [{ createdAt: "desc" }],
    include: {
      references: {
        where: { isCanonical: true, mergedIntoId: null },
        orderBy: [{ infoCompleteness: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          titleNormalized: true,
          year: true,
          doi: true,
          pmid: true,
          infoCompleteness: true,
          sources: { select: { sourceDatabase: true } },
        },
      },
    },
  });

  const groupsById = new Map(groups.map((group) => [group.id, group]));

  return {
    total,
    limit,
    offset,
    groups: pageIds
      .map((id) => groupsById.get(id))
      .filter((group): group is NonNullable<typeof group> => Boolean(group))
      .filter((group) => group.references.length >= 2)
      .map((group) => ({
        id: group.id,
        status: group.status,
        matchReason: group.matchReason,
        similarity: group.similarity,
        createdAt: group.createdAt.toISOString(),
        resolvedAt: group.resolvedAt?.toISOString() ?? null,
        title: group.references[0]?.title ?? "Sans titre",
        titleNormalized: group.references[0]?.titleNormalized ?? "",
        referenceCount: group.references.length,
        references: group.references.map((reference) => ({
          id: reference.id,
          title: reference.title,
          year: reference.year,
          doi: reference.doi,
          pmid: reference.pmid,
          sourceCount: reference.sources.length,
          sourceDatabases: Array.from(new Set(reference.sources.map((source) => source.sourceDatabase))),
          infoCompleteness: reference.infoCompleteness,
        })),
      })),
  };
}

export async function mergeDuplicateGroup(
  groupId: string,
  primaryReferenceId: string,
  userId?: string,
) {
  const group = await prisma.duplicateGroup.findUnique({
    where: { id: groupId },
    include: {
      references: {
        where: { isCanonical: true, mergedIntoId: null },
        include: { sources: true },
      },
    },
  });

  if (!group) {
    throw new Error("Groupe de doublons introuvable.");
  }

  if (group.status !== DuplicateGroupStatus.OPEN) {
    throw new Error("Ce groupe de doublons est déjà traité.");
  }

  const primary = group.references.find((reference) => reference.id === primaryReferenceId);
  if (!primary) {
    throw new Error("Référence principale invalide pour ce groupe.");
  }

  const secondaryIds = group.references
    .filter((reference) => reference.id !== primaryReferenceId)
    .map((reference) => reference.id);

  await prisma.$transaction(async (tx) => {
    let mergedPrimary: MergeableReference = {
      title: primary.title,
      abstract: primary.abstract,
      keywords: primary.keywords,
      meshTerms: primary.meshTerms,
      language: primary.language,
      publicationType: primary.publicationType,
      year: primary.year,
      authors: primary.authors,
      doi: primary.doi,
      pmid: primary.pmid,
      journal: primary.journal,
      volume: primary.volume,
      issue: primary.issue,
      pages: primary.pages,
    };

    for (const secondary of group.references) {
      if (secondary.id === primaryReferenceId) continue;

      mergedPrimary = mergeReferenceFields(mergedPrimary, secondary);

      await tx.referenceSource.updateMany({
        where: { referenceId: secondary.id },
        data: { referenceId: primaryReferenceId },
      });

      await tx.reference.update({
        where: { id: secondary.id },
        data: {
          mergedIntoId: primaryReferenceId,
          isCanonical: false,
          duplicateGroupId: null,
        },
      });
    }

    const completeness = buildCompletenessUpdate(mergedPrimary);

    await tx.reference.update({
      where: { id: primaryReferenceId },
      data: {
        title: mergedPrimary.title,
        abstract: mergedPrimary.abstract,
        keywords: mergedPrimary.keywords,
        meshTerms: mergedPrimary.meshTerms,
        language: mergedPrimary.language,
        publicationType: mergedPrimary.publicationType,
        year: mergedPrimary.year,
        authors: mergedPrimary.authors as Prisma.InputJsonValue,
        doi: mergedPrimary.doi,
        pmid: mergedPrimary.pmid,
        journal: mergedPrimary.journal,
        volume: mergedPrimary.volume,
        issue: mergedPrimary.issue,
        pages: mergedPrimary.pages,
        ...completeness,
        duplicateGroupId: null,
      },
    });

    await tx.duplicateGroup.update({
      where: { id: groupId },
      data: {
        status: DuplicateGroupStatus.MERGED,
        resolvedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        projectId: group.projectId,
        userId,
        action: AuditAction.DUPLICATE_MERGED,
        entityType: "DuplicateGroup",
        entityId: groupId,
        payload: {
          primaryReferenceId,
          mergedReferenceIds: secondaryIds,
          matchReason: group.matchReason,
        },
      },
    });
  });

  const { persistScoringResult } = await import("@/lib/scoring/service");
  await persistScoringResult(primaryReferenceId);

  return {
    groupId,
    primaryReferenceId,
    mergedCount: secondaryIds.length,
  };
}

export async function dismissDuplicateGroup(groupId: string, userId?: string) {
  const group = await prisma.duplicateGroup.findUnique({
    where: { id: groupId },
    select: { id: true, projectId: true, status: true, matchReason: true },
  });

  if (!group) {
    throw new Error("Groupe de doublons introuvable.");
  }

  if (group.status !== DuplicateGroupStatus.OPEN) {
    throw new Error("Ce groupe de doublons est déjà traité.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.reference.updateMany({
      where: { duplicateGroupId: groupId },
      data: { duplicateGroupId: null },
    });

    await tx.duplicateGroup.update({
      where: { id: groupId },
      data: {
        status: DuplicateGroupStatus.DISMISSED,
        resolvedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        projectId: group.projectId,
        userId,
        action: AuditAction.DUPLICATE_DISMISSED,
        entityType: "DuplicateGroup",
        entityId: groupId,
        payload: { matchReason: group.matchReason },
      },
    });
  });

  return { groupId, status: DuplicateGroupStatus.DISMISSED };
}

export async function mergeDuplicateGroupAutomatically(groupId: string, userId?: string) {
  const group = await prisma.duplicateGroup.findUnique({
    where: { id: groupId },
    include: {
      references: {
        where: { isCanonical: true, mergedIntoId: null },
        select: {
          id: true,
          infoCompleteness: true,
          _count: { select: { sources: true } },
        },
      },
    },
  });

  if (!group || group.references.length < 2) {
    throw new Error("Groupe de doublons introuvable ou incomplet.");
  }

  const primaryReferenceId = pickPrimaryReferenceId(
    group.references.map((reference) => ({
      id: reference.id,
      infoCompleteness: reference.infoCompleteness,
      sourceCount: reference._count.sources,
    })),
  );

  return mergeDuplicateGroup(groupId, primaryReferenceId, userId);
}

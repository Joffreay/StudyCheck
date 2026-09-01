import { prisma } from "@/lib/db";
import { AuditAction, Prisma, ScreeningStatus } from "@prisma/client";

export const DECISION_LABELS: Record<ScreeningStatus, string> = {
  PENDING: "À examiner",
  RETAIN: "Conservée pour la suite",
  EXCLUDE: "Exclue au pré-tri",
  UNCERTAIN: "Incertaine",
};

export type RecordDecisionInput = {
  referenceId: string;
  userId: string;
  status: ScreeningStatus;
  exclusionReasonId?: string | null;
  note?: string | null;
};

export async function recordDecision(input: RecordDecisionInput) {
  const reference = await prisma.reference.findUnique({
    where: { id: input.referenceId },
    select: { id: true, projectId: true },
  });

  if (!reference) {
    throw new Error("Référence introuvable.");
  }

  if (input.status === "EXCLUDE" && !input.exclusionReasonId) {
    throw new Error("Un motif d'exclusion est requis.");
  }

  const existing = await prisma.screeningDecision.findUnique({
    where: {
      referenceId_userId: {
        referenceId: input.referenceId,
        userId: input.userId,
      },
    },
  });

  const decidedAt = input.status === "PENDING" ? null : new Date();

  const decision = await prisma.screeningDecision.upsert({
    where: {
      referenceId_userId: {
        referenceId: input.referenceId,
        userId: input.userId,
      },
    },
    update: {
      status: input.status,
      exclusionReasonId: input.status === "EXCLUDE" ? input.exclusionReasonId ?? null : null,
      note: input.note ?? null,
      decidedAt,
    },
    create: {
      referenceId: input.referenceId,
      userId: input.userId,
      status: input.status,
      exclusionReasonId: input.status === "EXCLUDE" ? input.exclusionReasonId ?? null : null,
      note: input.note ?? null,
      decidedAt,
    },
    include: {
      exclusionReason: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.decisionEvent.create({
    data: {
      referenceId: input.referenceId,
      userId: input.userId,
      fromStatus: existing?.status ?? null,
      toStatus: input.status,
      exclusionReasonId: input.status === "EXCLUDE" ? input.exclusionReasonId ?? null : null,
      note: input.note ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      projectId: reference.projectId,
      userId: input.userId,
      action: existing ? AuditAction.DECISION_CHANGED : AuditAction.DECISION_RECORDED,
      entityType: "Reference",
      entityId: input.referenceId,
      payload: {
        status: input.status,
        exclusionReasonId: input.exclusionReasonId ?? null,
      },
    },
  });

  return decision;
}

export async function getDecisionHistory(referenceId: string) {
  return prisma.decisionEvent.findMany({
    where: { referenceId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      exclusionReason: true,
    },
  });
}

export type ReferenceListFilters = {
  projectId: string;
  userId: string;
  q?: string;
  status?: ScreeningStatus;
  scoreMin?: number;
  scoreMax?: number;
  tag?: string;
  alert?: string;
  sourceDatabase?: string;
  language?: string;
  hasAbstract?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "score_desc" | "score_asc" | "title_asc" | "year_desc";
};

const referenceListInclude = (userId: string) =>
  ({
    sources: { select: { sourceDatabase: true } },
    tags: true,
    scoringResults: { orderBy: { computedAt: "desc" as const }, take: 1 },
    screeningDecisions: {
      where: { userId },
      include: { exclusionReason: true },
    },
  }) satisfies Prisma.ReferenceInclude;

type ReferenceListRecord = Prisma.ReferenceGetPayload<{
  include: ReturnType<typeof referenceListInclude>;
}>;

function buildReferenceListWhere(filters: ReferenceListFilters): Prisma.ReferenceWhereInput {
  const where: Prisma.ReferenceWhereInput = {
    projectId: filters.projectId,
    isCanonical: true,
    mergedIntoId: null,
  };

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { abstract: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.language) {
    where.language = { equals: filters.language, mode: "insensitive" };
  }

  if (filters.hasAbstract !== undefined) {
    where.hasAbstract = filters.hasAbstract;
  }

  if (filters.sourceDatabase) {
    where.sources = { some: { sourceDatabase: filters.sourceDatabase } };
  }

  if (filters.tag) {
    where.tags = { some: { tagCode: filters.tag } };
  }

  if (filters.alert) {
    where.scoringResults = { some: { alerts: { has: filters.alert } } };
  }

  if (filters.status) {
    if (filters.status === "PENDING") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { screeningDecisions: { none: { userId: filters.userId } } },
            { screeningDecisions: { some: { userId: filters.userId, status: "PENDING" } } },
          ],
        },
      ];
    } else {
      where.screeningDecisions = {
        some: { userId: filters.userId, status: filters.status },
      };
    }
  }

  if (filters.scoreMin !== undefined || filters.scoreMax !== undefined) {
    where.scoringResults = {
      some: {
        scoreTotal: {
          gte: filters.scoreMin,
          lte: filters.scoreMax,
        },
      },
    };
  }

  return where;
}

function buildReferenceListOrderBy(
  sort: ReferenceListFilters["sort"],
): Prisma.ReferenceOrderByWithRelationInput[] {
  switch (sort) {
    case "title_asc":
      return [{ title: "asc" }, { id: "asc" }];
    case "year_desc":
      return [{ year: "desc" }, { title: "asc" }];
    case "score_asc":
    case "score_desc":
    default:
      return [];
  }
}

export function sortReferenceIdsByScore(
  refs: Array<{ id: string; score: number | null }>,
  sort: "score_desc" | "score_asc",
): string[] {
  return [...refs]
    .sort((a, b) => {
      const scoreA = a.score ?? 0;
      const scoreB = b.score ?? 0;
      return sort === "score_asc" ? scoreA - scoreB : scoreB - scoreA;
    })
    .map((ref) => ref.id);
}

async function getSortedReferenceIds(
  where: Prisma.ReferenceWhereInput,
  sort: ReferenceListFilters["sort"],
): Promise<string[]> {
  const resolvedSort = sort ?? "score_desc";

  if (resolvedSort === "title_asc" || resolvedSort === "year_desc") {
    const orderBy = buildReferenceListOrderBy(resolvedSort);
    const references = await prisma.reference.findMany({
      where,
      select: { id: true },
      orderBy,
    });
    return references.map((ref) => ref.id);
  }

  const references = await prisma.reference.findMany({
    where,
    select: {
      id: true,
      scoringResults: {
        orderBy: { computedAt: "desc" },
        take: 1,
        select: { scoreTotal: true },
      },
    },
  });

  return sortReferenceIdsByScore(
    references.map((ref) => ({
      id: ref.id,
      score: ref.scoringResults[0]?.scoreTotal ?? null,
    })),
    resolvedSort,
  );
}

function mapReferenceListItem(ref: ReferenceListRecord) {
  return {
    id: ref.id,
    title: ref.title,
    year: ref.year,
    language: ref.language,
    hasAbstract: ref.hasAbstract,
    infoCompleteness: ref.infoCompleteness,
    infoGapFlags: ref.infoGapFlags,
    sources: Array.from(new Set(ref.sources.map((s) => s.sourceDatabase))),
    score: ref.scoringResults[0]?.scoreTotal ?? null,
    subscores: ref.scoringResults[0]?.subscores ?? null,
    alerts: ref.scoringResults[0]?.alerts ?? [],
    tags: ref.tags,
    decision: ref.screeningDecisions[0] ?? null,
  };
}

export async function listReferences(filters: ReferenceListFilters) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 50, 100);
  const where = buildReferenceListWhere(filters);
  const sortedIds = await getSortedReferenceIds(where, filters.sort);
  const total = sortedIds.length;
  const pageIds = sortedIds.slice((page - 1) * pageSize, page * pageSize);

  if (pageIds.length === 0) {
    return {
      items: [],
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  const references = await prisma.reference.findMany({
    where: { id: { in: pageIds } },
    include: referenceListInclude(filters.userId),
  });

  const referencesById = new Map(references.map((ref) => [ref.id, ref]));
  const orderedReferences = pageIds
    .map((id) => referencesById.get(id))
    .filter((ref): ref is ReferenceListRecord => ref !== undefined);

  return {
    items: orderedReferences.map(mapReferenceListItem),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function exportReferences(filters: ReferenceListFilters) {
  const where = buildReferenceListWhere(filters);
  const sortedIds = await getSortedReferenceIds(where, filters.sort);

  if (sortedIds.length === 0) {
    return { total: 0, rows: [] };
  }

  const references = await prisma.reference.findMany({
    where: { id: { in: sortedIds } },
    include: referenceListInclude(filters.userId),
  });

  const referencesById = new Map(references.map((ref) => [ref.id, ref]));
  const orderedReferences = sortedIds
    .map((id) => referencesById.get(id))
    .filter((ref): ref is ReferenceListRecord => ref !== undefined);

  return {
    total: orderedReferences.length,
    rows: orderedReferences.map((ref) => {
      const decision = ref.screeningDecisions[0];
      return {
        id: ref.id,
        title: ref.title,
        year: ref.year,
        language: ref.language,
        journal: ref.journal,
        doi: ref.doi,
        pmid: ref.pmid,
        score: ref.scoringResults[0]?.scoreTotal ?? null,
        decisionStatus: DECISION_LABELS[decision?.status ?? "PENDING"],
        exclusionReason: decision?.exclusionReason?.label ?? null,
        sources: Array.from(new Set(ref.sources.map((s) => s.sourceDatabase))).join("; "),
        tags: ref.tags.map((tag) => tag.label).join("; "),
        alerts: (ref.scoringResults[0]?.alerts ?? []).join("; "),
        keywords: ref.keywords.join("; "),
        meshTerms: ref.meshTerms.join("; "),
        hasAbstract: ref.hasAbstract,
        infoCompleteness: ref.infoCompleteness,
      };
    }),
  };
}

export function parseReferenceListFilters(input: {
  projectId: string;
  userId: string;
  q?: string | null;
  status?: ScreeningStatus;
  scoreMin?: number;
  scoreMax?: number;
  tag?: string | null;
  alert?: string | null;
  sourceDatabase?: string | null;
  language?: string | null;
  hasAbstract?: boolean;
  page?: number;
  pageSize?: number;
  sort?: ReferenceListFilters["sort"];
}): ReferenceListFilters {
  return {
    projectId: input.projectId,
    userId: input.userId,
    q: input.q ?? undefined,
    status: input.status,
    scoreMin: input.scoreMin,
    scoreMax: input.scoreMax,
    tag: input.tag ?? undefined,
    alert: input.alert ?? undefined,
    sourceDatabase: input.sourceDatabase ?? undefined,
    language: input.language ?? undefined,
    hasAbstract: input.hasAbstract,
    page: input.page,
    pageSize: input.pageSize,
    sort: input.sort ?? "score_desc",
  };
}

export async function getReferenceDetail(referenceId: string, userId: string) {
  const reference = await prisma.reference.findUnique({
    where: { id: referenceId },
    include: {
      sources: { include: { importBatch: { select: { filename: true, importedAt: true } } } },
      tags: true,
      scoringResults: { orderBy: { computedAt: "desc" }, take: 1 },
      screeningDecisions: {
        where: { userId },
        include: { exclusionReason: true },
      },
      criterionAssessments: true,
      decisionEvents: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true } },
          exclusionReason: true,
        },
      },
    },
  });

  if (!reference) return null;

  const scoring = reference.scoringResults[0];
  const triggered = scoring?.triggeredRules as
    | {
        rules?: Array<Record<string, unknown>>;
        tags?: Array<Record<string, unknown>>;
        combinationBonuses?: Array<Record<string, unknown>>;
        directExclusion?: {
          id: string;
          label: string;
          detail?: string;
        } | null;
      }
    | undefined;

  return {
    id: reference.id,
    title: reference.title,
    abstract: reference.abstract,
    keywords: reference.keywords,
    meshTerms: reference.meshTerms,
    language: reference.language,
    publicationType: reference.publicationType,
    year: reference.year,
    doi: reference.doi,
    pmid: reference.pmid,
    journal: reference.journal,
    hasAbstract: reference.hasAbstract,
    infoCompleteness: reference.infoCompleteness,
    infoGapFlags: reference.infoGapFlags,
    sources: reference.sources,
    decisionEvents: reference.decisionEvents,
    scoring,
    triggeredRules: triggered?.rules ?? [],
    triggeredTagsDetail: triggered?.tags ?? [],
    combinationBonuses: triggered?.combinationBonuses ?? [],
    directExclusion: triggered?.directExclusion ?? null,
    decision: reference.screeningDecisions[0] ?? null,
  };
}

export async function getNextPendingReferenceId(projectId: string, userId: string, currentId: string) {
  const result = await listReferences({
    projectId,
    userId,
    status: "PENDING",
    page: 1,
    pageSize: 500,
    sort: "score_desc",
  });

  const index = result.items.findIndex((item) => item.id === currentId);
  if (index >= 0 && index < result.items.length - 1) {
    return result.items[index + 1].id;
  }

  const pending = result.items.find((item) => item.id !== currentId);
  return pending?.id ?? null;
}

export async function getProjectFilterOptions(projectId: string) {
  const [sources, languages, exclusionReasons] = await Promise.all([
    prisma.referenceSource.findMany({
      where: { reference: { projectId } },
      distinct: ["sourceDatabase"],
      select: { sourceDatabase: true },
    }),
    prisma.reference.findMany({
      where: { projectId, language: { not: null } },
      distinct: ["language"],
      select: { language: true },
    }),
    prisma.exclusionReason.findMany({
      where: { projectId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return {
    sourceDatabases: sources.map((s) => s.sourceDatabase).sort(),
    languages: languages.map((l) => l.language!).filter(Boolean).sort(),
    exclusionReasons,
    tags: [
      { code: "CO_INTERVENTION_POTENTIAL", label: "Co-intervention potentielle" },
      { code: "RELATED_INTERVENTION_CONTINGENCY", label: "Intervention apparentée — contingence" },
    ],
    alerts: [
      { code: "NO_ABSTRACT", label: "Sans résumé" },
      { code: "BROAD_MESH_DRAMA", label: "MeSH Drama large" },
      { code: "AMBIGUOUS_POPULATION", label: "Population ambiguë" },
      { code: "NON_FR_EN_LANGUAGE", label: "Langue hors français/anglais" },
    ],
  };
}

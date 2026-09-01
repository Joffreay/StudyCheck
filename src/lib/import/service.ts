import type { ImportFormat, ParsedReference } from "@/lib/parsers";
import { parseBibliographicFile } from "@/lib/parsers";
import { prisma } from "@/lib/db";
import {
  buildCanonicalKey,
  buildInfoGapFlags,
  computeInfoCompleteness,
  normalizeDoi,
  normalizePmid,
  normalizeTitle,
} from "@/lib/references/normalize";
import { AuditAction, ImportStatus, Prisma } from "@prisma/client";

export type ImportRequest = {
  projectId: string;
  filename: string;
  format: ImportFormat;
  sourceDatabase: string;
  content: string;
};

export type ImportSummary = {
  batchId: string;
  recordsTotal: number;
  recordsImported: number;
  recordsSkipped: number;
  recordsMerged: number;
  errors: Array<{ line?: number; message: string }>;
};

function mergeReferenceFields(existing: {
  title: string;
  abstract: string | null;
  keywords: string[];
  meshTerms: string[];
  language: string | null;
  publicationType: string | null;
  year: number | null;
  authors: unknown;
  doi: string | null;
  pmid: string | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
}, incoming: ParsedReference) {
  const abstract =
    (existing.abstract?.length ?? 0) >= (incoming.abstract?.length ?? 0)
      ? existing.abstract
      : incoming.abstract ?? existing.abstract;

  return {
    title: existing.title || incoming.title,
    abstract: abstract ?? null,
    keywords: Array.from(new Set([...existing.keywords, ...incoming.keywords])),
    meshTerms: Array.from(new Set([...existing.meshTerms, ...incoming.meshTerms])),
    language: existing.language ?? incoming.language ?? null,
    publicationType: existing.publicationType ?? incoming.publicationType ?? null,
    year: existing.year ?? incoming.year ?? null,
    authors: existing.authors ?? incoming.authors,
    doi: existing.doi ?? normalizeDoi(incoming.doi) ?? null,
    pmid: existing.pmid ?? normalizePmid(incoming.pmid) ?? null,
    journal: existing.journal ?? incoming.journal ?? null,
    volume: existing.volume ?? incoming.volume ?? null,
    issue: existing.issue ?? incoming.issue ?? null,
    pages: existing.pages ?? incoming.pages ?? null,
  };
}

export async function importBibliographicFile(request: ImportRequest): Promise<ImportSummary> {
  const parsed = parseBibliographicFile(request.content, request.format);

  const batch = await prisma.importBatch.create({
    data: {
      projectId: request.projectId,
      filename: request.filename,
      format: request.format,
      sourceDatabase: request.sourceDatabase,
      status: ImportStatus.PROCESSING,
      recordsTotal: parsed.references.length,
    },
  });

  await prisma.auditLog.create({
    data: {
      projectId: request.projectId,
      action: AuditAction.IMPORT_STARTED,
      entityType: "ImportBatch",
      entityId: batch.id,
      payload: {
        filename: request.filename,
        format: request.format,
        sourceDatabase: request.sourceDatabase,
      },
    },
  });

  let recordsImported = 0;
  let recordsSkipped = 0;
  let recordsMerged = 0;
  const affectedReferenceIds: string[] = [];

  for (const item of parsed.references) {
    const canonicalKey = buildCanonicalKey({
      doi: item.doi,
      pmid: item.pmid,
      title: item.title,
      year: item.year,
    });

    const existing = await prisma.reference.findUnique({
      where: {
        projectId_canonicalKey: {
          projectId: request.projectId,
          canonicalKey,
        },
      },
    });

    if (existing) {
      const merged = mergeReferenceFields(existing, item);
      const hasAbstract = Boolean(merged.abstract?.trim());
      const keywordsCount = merged.keywords.length;
      const meshCount = merged.meshTerms.length;

      await prisma.reference.update({
        where: { id: existing.id },
        data: {
          ...merged,
          hasAbstract,
          infoCompleteness: computeInfoCompleteness({
            hasAbstract,
            keywordsCount,
            meshCount,
            hasDoi: Boolean(merged.doi),
            hasPmid: Boolean(merged.pmid),
          }),
          infoGapFlags: buildInfoGapFlags({ hasAbstract, keywordsCount, meshCount }),
        },
      });

      await prisma.referenceSource.create({
        data: {
          referenceId: existing.id,
          importBatchId: batch.id,
          sourceDatabase: request.sourceDatabase,
          externalIds: item.externalIds as Prisma.InputJsonValue,
          rawRecord: item.rawRecord as Prisma.InputJsonValue,
        },
      });

      affectedReferenceIds.push(existing.id);
      recordsMerged += 1;
      continue;
    }

    const hasAbstract = Boolean(item.abstract?.trim());
    const keywordsCount = item.keywords.length;
    const meshCount = item.meshTerms.length;

    const created = await prisma.reference.create({
      data: {
        projectId: request.projectId,
        canonicalKey,
        title: item.title,
        titleNormalized: normalizeTitle(item.title),
        abstract: item.abstract ?? null,
        keywords: item.keywords,
        meshTerms: item.meshTerms,
        language: item.language ?? null,
        publicationType: item.publicationType ?? null,
        year: item.year ?? null,
        authors: item.authors,
        doi: normalizeDoi(item.doi) ?? null,
        pmid: normalizePmid(item.pmid) ?? null,
        journal: item.journal ?? null,
        volume: item.volume ?? null,
        issue: item.issue ?? null,
        pages: item.pages ?? null,
        hasAbstract,
        infoCompleteness: computeInfoCompleteness({
          hasAbstract,
          keywordsCount,
          meshCount,
          hasDoi: Boolean(item.doi),
          hasPmid: Boolean(item.pmid),
        }),
        infoGapFlags: buildInfoGapFlags({ hasAbstract, keywordsCount, meshCount }),
        sources: {
          create: {
            importBatchId: batch.id,
            sourceDatabase: request.sourceDatabase,
            externalIds: item.externalIds as Prisma.InputJsonValue,
            rawRecord: item.rawRecord as Prisma.InputJsonValue,
          },
        },
      },
    });

    affectedReferenceIds.push(created.id);
    recordsImported += 1;
  }

  if (affectedReferenceIds.length > 0) {
    const { rescoreReferences } = await import("@/lib/scoring/service");
    await rescoreReferences(affectedReferenceIds);
  }

  recordsSkipped = parsed.errors.length;

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: ImportStatus.COMPLETED,
      recordsImported,
      recordsSkipped,
      importedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      projectId: request.projectId,
      action: AuditAction.IMPORT_COMPLETED,
      entityType: "ImportBatch",
      entityId: batch.id,
      payload: {
        recordsTotal: parsed.references.length,
        recordsImported,
        recordsMerged,
        recordsSkipped,
        errors: parsed.errors,
      },
    },
  });

  return {
    batchId: batch.id,
    recordsTotal: parsed.references.length,
    recordsImported,
    recordsSkipped,
    recordsMerged,
    errors: parsed.errors,
  };
}

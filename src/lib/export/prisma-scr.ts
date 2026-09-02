import { prisma } from "@/lib/db";
import { AuditAction } from "@prisma/client";
import type { PrismaScrFlow } from "./prisma-scr-types";
import {
  buildConsensusScreening,
  buildExclusionReasonCounts,
  buildReaderScreeningCounts,
  type ReferenceDecisionSnapshot,
} from "./prisma-scr-types";

export async function computePrismaScrFlow(projectId: string): Promise<PrismaScrFlow> {
  const project = await prisma.reviewProject.findUnique({
    where: { id: projectId },
    select: { id: true, title: true },
  });

  if (!project) {
    throw new Error("Projet introuvable.");
  }

  const [batches, recordsAfterDeduplication, readers, references] = await Promise.all([
    prisma.importBatch.findMany({
      where: { projectId, status: "COMPLETED" },
      orderBy: [{ importedAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.reference.count({
      where: { projectId, isCanonical: true, mergedIntoId: null },
    }),
    prisma.user.findMany({
      where: { role: "READER" },
      select: { id: true, name: true },
      orderBy: { email: "asc" },
    }),
    prisma.reference.findMany({
      where: { projectId, isCanonical: true, mergedIntoId: null },
      select: {
        id: true,
        screeningDecisions: {
          select: {
            userId: true,
            status: true,
            exclusionReason: {
              select: { code: true, label: true },
            },
          },
        },
      },
    }),
  ]);

  const sourceMap = new Map<string, { recordsIdentified: number; importBatchCount: number }>();
  for (const batch of batches) {
    const existing = sourceMap.get(batch.sourceDatabase) ?? {
      recordsIdentified: 0,
      importBatchCount: 0,
    };
    existing.recordsIdentified += batch.recordsTotal;
    existing.importBatchCount += 1;
    sourceMap.set(batch.sourceDatabase, existing);
  }

  const bySource = Array.from(sourceMap.entries())
    .map(([sourceDatabase, stats]) => ({
      sourceDatabase,
      recordsIdentified: stats.recordsIdentified,
      importBatchCount: stats.importBatchCount,
    }))
    .sort((a, b) => b.recordsIdentified - a.recordsIdentified || a.sourceDatabase.localeCompare(b.sourceDatabase));

  const totalRecordsIdentified = batches.reduce((sum, batch) => sum + batch.recordsTotal, 0);
  const duplicatesRemoved = Math.max(0, totalRecordsIdentified - recordsAfterDeduplication);

  const readerNameById = new Map(readers.map((reader) => [reader.id, reader.name]));

  const referenceSnapshots: ReferenceDecisionSnapshot[] = references.map((reference) => ({
    referenceId: reference.id,
    decisions: reference.screeningDecisions.map((decision) => ({
      readerId: decision.userId,
      status: decision.status,
      exclusionReasonCode: decision.exclusionReason?.code ?? null,
      exclusionReasonLabel: decision.exclusionReason?.label ?? null,
    })),
  }));

  const readerIds = readers.map((reader) => reader.id);
  const consensus = buildConsensusScreening(referenceSnapshots, readerIds);

  const byReader = readers.map((reader) => {
    const decisions = references.map((reference) => {
      const decision = reference.screeningDecisions.find((item) => item.userId === reader.id);
      return { status: decision?.status ?? ("PENDING" as const) };
    });

    return buildReaderScreeningCounts(reader.id, reader.name, references.length, decisions);
  });

  const exclusionReasons = buildExclusionReasonCounts(referenceSnapshots).map((item) => ({
    ...item,
    readerName: readerNameById.get(item.readerId) ?? item.readerId,
  }));

  return {
    projectId: project.id,
    projectTitle: project.title,
    generatedAt: new Date().toISOString(),
    phase: "title_abstract_screening",
    identification: {
      bySource,
      totalRecordsIdentified,
    },
    deduplication: {
      duplicatesRemoved,
      recordsAfterDeduplication,
    },
    screening: {
      byReader,
      consensus,
    },
    exclusionReasons,
    eligibility: {
      reportsProceedingFromScreening: consensus.proceedingToFullText,
      note:
        "Comptage basé sur l'accord des deux lecteurs (RETAIN). L'éligibilité texte intégral n'est pas encore gérée dans StudyCheck.",
    },
    included: {
      count: 0,
      note: "Les inclusions définitives seront comptabilisées après l'évaluation du texte intégral (critères A/B/C).",
    },
    imports: batches.map((batch) => ({
      id: batch.id,
      filename: batch.filename,
      sourceDatabase: batch.sourceDatabase,
      format: batch.format,
      recordsTotal: batch.recordsTotal,
      recordsImported: batch.recordsImported,
      recordsSkipped: batch.recordsSkipped,
      importedAt: batch.importedAt?.toISOString() ?? null,
    })),
  };
}

export async function recordPrismaScrExport(projectId: string, userId: string, format: string) {
  const flow = await computePrismaScrFlow(projectId);

  await prisma.auditLog.create({
    data: {
      projectId,
      userId,
      action: AuditAction.EXPORT_GENERATED,
      entityType: "ReviewProject",
      entityId: projectId,
      payload: {
        exportType: "PRISMA-SCR",
        format,
        generatedAt: flow.generatedAt,
        totalRecordsIdentified: flow.identification.totalRecordsIdentified,
        recordsAfterDeduplication: flow.deduplication.recordsAfterDeduplication,
        proceedingToFullText: flow.eligibility.reportsProceedingFromScreening,
      },
    },
  });

  return flow;
}

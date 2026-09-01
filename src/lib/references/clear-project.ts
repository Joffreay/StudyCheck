import { prisma } from "@/lib/db";
import { AuditAction } from "@prisma/client";

export type ClearProjectReferencesSummary = {
  referencesBefore: number;
  deletedReferences: number;
  deletedImportBatches: number;
  deletedDuplicateGroups: number;
  deletedCalibrationItems: number;
};

export async function clearProjectReferences(
  projectId: string,
  userId?: string,
): Promise<ClearProjectReferencesSummary> {
  const referencesBefore = await prisma.reference.count({ where: { projectId } });

  const referenceIds = await prisma.reference.findMany({
    where: { projectId },
    select: { id: true },
  });

  let deletedCalibrationItems = { count: 0 };

  if (referenceIds.length > 0) {
    deletedCalibrationItems = await prisma.calibrationItem.deleteMany({
      where: { referenceId: { in: referenceIds.map((ref) => ref.id) } },
    });
  }

  const [deletedReferences, deletedImportBatches, deletedDuplicateGroups] = await prisma.$transaction([
    prisma.reference.deleteMany({ where: { projectId } }),
    prisma.importBatch.deleteMany({ where: { projectId } }),
    prisma.duplicateGroup.deleteMany({ where: { projectId } }),
  ]);

  await prisma.auditLog.create({
    data: {
      projectId,
      userId,
      action: AuditAction.IMPORT_COMPLETED,
      entityType: "ReviewProject",
      entityId: projectId,
      payload: {
        operation: "references_cleared",
        referencesBefore,
        deletedReferences: deletedReferences.count,
        deletedImportBatches: deletedImportBatches.count,
        deletedDuplicateGroups: deletedDuplicateGroups.count,
        deletedCalibrationItems: deletedCalibrationItems.count,
      },
    },
  });

  return {
    referencesBefore,
    deletedReferences: deletedReferences.count,
    deletedImportBatches: deletedImportBatches.count,
    deletedDuplicateGroups: deletedDuplicateGroups.count,
    deletedCalibrationItems: deletedCalibrationItems.count,
  };
}

import { prisma } from "@/lib/db";
import {
  DEFAULT_SCORING_CONFIG_VERSION,
  loadScoringConfig,
  resetScoringConfigCache,
} from "@/lib/scoring/config";
import { scoreReference } from "@/lib/scoring/engine";
import { recordDecision } from "@/lib/screening/service";
import { AuditAction, Prisma, UserRole } from "@prisma/client";
import type { DirectExclusion } from "./types";

async function applyDirectExclusion(
  referenceId: string,
  projectId: string,
  directExclusion: DirectExclusion,
) {
  const exclusionReason = await prisma.exclusionReason.findFirst({
    where: {
      projectId,
      code: directExclusion.exclusionReasonCode,
      isActive: true,
    },
  });

  if (!exclusionReason) return;

  const readers = await prisma.user.findMany({
    where: { role: UserRole.READER },
    select: { id: true },
  });

  const note = directExclusion.detail
    ? `Exclusion automatique — ${directExclusion.label} (${directExclusion.detail})`
    : `Exclusion automatique — ${directExclusion.label}`;

  for (const reader of readers) {
    const existing = await prisma.screeningDecision.findUnique({
      where: {
        referenceId_userId: {
          referenceId,
          userId: reader.id,
        },
      },
    });

    if (existing && existing.status !== "PENDING") continue;

    await recordDecision({
      referenceId,
      userId: reader.id,
      status: "EXCLUDE",
      exclusionReasonId: exclusionReason.id,
      note,
    });
  }
}

export async function persistScoringResult(referenceId: string) {
  const reference = await prisma.reference.findUnique({
    where: { id: referenceId },
  });

  if (!reference) {
    throw new Error(`Référence introuvable: ${referenceId}`);
  }

  const result = scoreReference({
    title: reference.title,
    abstract: reference.abstract,
    keywords: reference.keywords,
    meshTerms: reference.meshTerms,
    publicationType: reference.publicationType,
    language: reference.language,
    hasAbstract: reference.hasAbstract,
  });

  await prisma.$transaction(async (tx) => {
    await tx.scoringResult.create({
      data: {
        referenceId,
        ruleConfigVersion: result.ruleConfigVersion,
        scoreTotal: result.scoreTotal,
        subscores: result.subscores as Prisma.InputJsonValue,
        triggeredRules: {
          rules: result.triggeredRules,
          tags: result.triggeredTags,
          combinationBonuses: result.combinationBonuses,
          directExclusion: result.directExclusion ?? null,
        } as Prisma.InputJsonValue,
        tags: result.triggeredTags.map((tag) => tag.tagCode),
        alerts: result.alerts,
      },
    });

    await tx.referenceTag.deleteMany({ where: { referenceId } });

    for (const tag of result.triggeredTags) {
      await tx.referenceTag.upsert({
        where: {
          referenceId_tagCode: {
            referenceId,
            tagCode: tag.tagCode,
          },
        },
        update: {
          label: tag.label,
          explanation: {
            matchedTerm: tag.matchedTerm,
            matchedText: tag.matchedText,
            field: tag.field,
          },
        },
        create: {
          referenceId,
          tagCode: tag.tagCode,
          label: tag.label,
          explanation: {
            matchedTerm: tag.matchedTerm,
            matchedText: tag.matchedText,
            field: tag.field,
          },
        },
      });
    }
  });

  if (result.directExclusion) {
    await applyDirectExclusion(referenceId, reference.projectId, result.directExclusion);
  }

  return result;
}

export async function rescoreProject(projectId: string, userId?: string) {
  resetScoringConfigCache();
  const config = loadScoringConfig(DEFAULT_SCORING_CONFIG_VERSION);

  const references = await prisma.reference.findMany({
    where: { projectId, isCanonical: true, mergedIntoId: null },
    select: { id: true },
  });

  let processed = 0;

  for (const reference of references) {
    await persistScoringResult(reference.id);
    processed += 1;
  }

  await prisma.auditLog.create({
    data: {
      projectId,
      userId,
      action: AuditAction.SCORING_RECOMPUTED,
      entityType: "ReviewProject",
      entityId: projectId,
      payload: { processed, ruleConfigVersion: config.version },
    },
  });

  return { processed, ruleConfigVersion: config.version };
}

export async function rescoreReferences(referenceIds: string[]) {
  resetScoringConfigCache();

  const results = [];
  for (const referenceId of referenceIds) {
    results.push(await persistScoringResult(referenceId));
  }

  return {
    processed: results.length,
    ruleConfigVersion:
      results[0]?.ruleConfigVersion ?? loadScoringConfig(DEFAULT_SCORING_CONFIG_VERSION).version,
  };
}

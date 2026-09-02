import type { ScreeningStatus } from "@prisma/client";

export type PrismaScrSourceIdentification = {
  sourceDatabase: string;
  recordsIdentified: number;
  importBatchCount: number;
};

export type PrismaScrImportBatchSummary = {
  id: string;
  filename: string;
  sourceDatabase: string;
  format: string;
  recordsTotal: number;
  recordsImported: number;
  recordsSkipped: number;
  importedAt: string | null;
};

export type PrismaScrReaderScreening = {
  readerId: string;
  readerName: string;
  pending: number;
  retain: number;
  exclude: number;
  uncertain: number;
  screened: number;
  excluded: number;
  proceeding: number;
};

export type PrismaScrExclusionReasonCount = {
  reasonCode: string;
  reasonLabel: string;
  readerId: string;
  readerName: string;
  count: number;
};

export type PrismaScrConsensusScreening = {
  bothPending: number;
  bothRetain: number;
  bothExclude: number;
  bothUncertain: number;
  disagreement: number;
  onePending: number;
  proceedingToFullText: number;
  excludedAtScreening: number;
};

export type PrismaScrFlow = {
  projectId: string;
  projectTitle: string;
  generatedAt: string;
  phase: "title_abstract_screening";
  identification: {
    bySource: PrismaScrSourceIdentification[];
    totalRecordsIdentified: number;
  };
  deduplication: {
    duplicatesRemoved: number;
    recordsAfterDeduplication: number;
  };
  screening: {
    byReader: PrismaScrReaderScreening[];
    consensus: PrismaScrConsensusScreening;
  };
  exclusionReasons: PrismaScrExclusionReasonCount[];
  eligibility: {
    reportsProceedingFromScreening: number;
    note: string;
  };
  included: {
    count: number;
    note: string;
  };
  imports: PrismaScrImportBatchSummary[];
};

export type ReaderDecisionSnapshot = {
  readerId: string;
  status: ScreeningStatus;
  exclusionReasonCode: string | null;
  exclusionReasonLabel: string | null;
};

export type ReferenceDecisionSnapshot = {
  referenceId: string;
  decisions: ReaderDecisionSnapshot[];
};

export function buildReaderScreeningCounts(
  readerId: string,
  readerName: string,
  totalReferences: number,
  decisions: Array<{ status: ScreeningStatus }>,
): PrismaScrReaderScreening {
  const pending =
    totalReferences -
    decisions.filter((decision) => decision.status !== "PENDING").length;
  const retain = decisions.filter((decision) => decision.status === "RETAIN").length;
  const exclude = decisions.filter((decision) => decision.status === "EXCLUDE").length;
  const uncertain = decisions.filter((decision) => decision.status === "UNCERTAIN").length;
  const screened = retain + exclude + uncertain;

  return {
    readerId,
    readerName,
    pending,
    retain,
    exclude,
    uncertain,
    screened,
    excluded: exclude,
    proceeding: retain,
  };
}

function getReaderDecision(
  reference: ReferenceDecisionSnapshot,
  readerId: string,
): ScreeningStatus {
  return reference.decisions.find((decision) => decision.readerId === readerId)?.status ?? "PENDING";
}

export function buildConsensusScreening(
  references: ReferenceDecisionSnapshot[],
  readerIds: string[],
): PrismaScrConsensusScreening {
  if (readerIds.length === 0) {
    return {
      bothPending: references.length,
      bothRetain: 0,
      bothExclude: 0,
      bothUncertain: 0,
      disagreement: 0,
      onePending: 0,
      proceedingToFullText: 0,
      excludedAtScreening: 0,
    };
  }

  let bothPending = 0;
  let bothRetain = 0;
  let bothExclude = 0;
  let bothUncertain = 0;
  let disagreement = 0;
  let onePending = 0;

  for (const reference of references) {
    const statuses = readerIds.map((readerId) => getReaderDecision(reference, readerId));
    const uniqueStatuses = new Set(statuses);
    const pendingCount = statuses.filter((status) => status === "PENDING").length;

    if (pendingCount === readerIds.length) {
      bothPending += 1;
      continue;
    }

    if (pendingCount > 0) {
      onePending += 1;
      continue;
    }

    if (uniqueStatuses.size === 1) {
      const status = statuses[0];
      if (status === "RETAIN") bothRetain += 1;
      else if (status === "EXCLUDE") bothExclude += 1;
      else if (status === "UNCERTAIN") bothUncertain += 1;
      continue;
    }

    disagreement += 1;
  }

  return {
    bothPending,
    bothRetain,
    bothExclude,
    bothUncertain,
    disagreement,
    onePending,
    proceedingToFullText: bothRetain,
    excludedAtScreening: bothExclude,
  };
}

export function buildExclusionReasonCounts(
  references: ReferenceDecisionSnapshot[],
): PrismaScrExclusionReasonCount[] {
  const counts = new Map<string, PrismaScrExclusionReasonCount>();

  for (const reference of references) {
    for (const decision of reference.decisions) {
      if (decision.status !== "EXCLUDE" || !decision.exclusionReasonCode) continue;

      const key = `${decision.readerId}:${decision.exclusionReasonCode}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }

      counts.set(key, {
        reasonCode: decision.exclusionReasonCode,
        reasonLabel: decision.exclusionReasonLabel ?? decision.exclusionReasonCode,
        readerId: decision.readerId,
        readerName: "",
        count: 1,
      });
    }
  }

  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.reasonLabel.localeCompare(b.reasonLabel));
}

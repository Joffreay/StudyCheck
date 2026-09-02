import { describe, expect, it } from "vitest";
import { prismaScrToCsv } from "@/lib/export/prisma-scr-format";
import { buildPrismaScrSankeyGraph } from "@/lib/export/prisma-scr-sankey";
import {
  buildConsensusScreening,
  buildExclusionReasonCounts,
  buildReaderScreeningCounts,
  type PrismaScrFlow,
  type ReferenceDecisionSnapshot,
} from "@/lib/export/prisma-scr-types";

const sampleFlow: PrismaScrFlow = {
  projectId: "proj-1",
  projectTitle: "Test",
  generatedAt: "2026-09-02T12:00:00.000Z",
  phase: "title_abstract_screening",
  identification: {
    bySource: [
      { sourceDatabase: "PubMed", recordsIdentified: 120, importBatchCount: 1 },
      { sourceDatabase: "Embase", recordsIdentified: 80, importBatchCount: 1 },
    ],
    totalRecordsIdentified: 200,
  },
  deduplication: {
    duplicatesRemoved: 35,
    recordsAfterDeduplication: 165,
  },
  screening: {
    byReader: [],
    consensus: {
      bothPending: 100,
      bothRetain: 20,
      bothExclude: 30,
      bothUncertain: 5,
      disagreement: 8,
      onePending: 2,
      proceedingToFullText: 20,
      excludedAtScreening: 30,
    },
  },
  exclusionReasons: [],
  eligibility: {
    reportsProceedingFromScreening: 20,
    note: "note",
  },
  included: { count: 0, note: "note" },
  imports: [],
};

describe("buildPrismaScrSankeyGraph", () => {
  it("construit les liens entre sources, déduplication et screening", () => {
    const graph = buildPrismaScrSankeyGraph(sampleFlow);

    expect(graph.nodes.some((node) => node.id === "source:pubmed")).toBe(true);
    expect(graph.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "source:pubmed", target: "total-identified", value: 120 }),
        expect.objectContaining({ source: "total-identified", target: "duplicates-removed", value: 35 }),
        expect.objectContaining({ source: "records-unique", target: "screening-retain", value: 20 }),
        expect.objectContaining({ source: "screening-retain", target: "eligibility-full-text", value: 20 }),
      ]),
    );
  });

  it("regroupe les statuts en attente", () => {
    const graph = buildPrismaScrSankeyGraph(sampleFlow);
    const pendingLink = graph.links.find((link) => link.target === "screening-pending");
    expect(pendingLink?.value).toBe(102);
  });
});

describe("buildReaderScreeningCounts", () => {
  it("compte les statuts par lecteur", () => {
    const result = buildReaderScreeningCounts("r1", "Lecteur 1", 5, [
      { status: "RETAIN" },
      { status: "EXCLUDE" },
      { status: "UNCERTAIN" },
      { status: "PENDING" },
      { status: "RETAIN" },
    ]);

    expect(result).toMatchObject({
      retain: 2,
      exclude: 1,
      uncertain: 1,
      pending: 1,
      screened: 4,
      proceeding: 2,
    });
  });
});

describe("buildConsensusScreening", () => {
  const readerIds = ["r1", "r2"];

  it("détecte les accords et désaccords entre deux lecteurs", () => {
    const references: ReferenceDecisionSnapshot[] = [
      {
        referenceId: "a",
        decisions: [
          { readerId: "r1", status: "RETAIN", exclusionReasonCode: null, exclusionReasonLabel: null },
          { readerId: "r2", status: "RETAIN", exclusionReasonCode: null, exclusionReasonLabel: null },
        ],
      },
      {
        referenceId: "b",
        decisions: [
          { readerId: "r1", status: "EXCLUDE", exclusionReasonCode: "LANGUAGE", exclusionReasonLabel: "Langue" },
          { readerId: "r2", status: "EXCLUDE", exclusionReasonCode: "LANGUAGE", exclusionReasonLabel: "Langue" },
        ],
      },
      {
        referenceId: "c",
        decisions: [
          { readerId: "r1", status: "RETAIN", exclusionReasonCode: null, exclusionReasonLabel: null },
          { readerId: "r2", status: "EXCLUDE", exclusionReasonCode: "OFF_TOPIC_TITLE", exclusionReasonLabel: "Hors sujet" },
        ],
      },
      {
        referenceId: "d",
        decisions: [
          { readerId: "r1", status: "PENDING", exclusionReasonCode: null, exclusionReasonLabel: null },
          { readerId: "r2", status: "PENDING", exclusionReasonCode: null, exclusionReasonLabel: null },
        ],
      },
    ];

    expect(buildConsensusScreening(references, readerIds)).toMatchObject({
      bothRetain: 1,
      bothExclude: 1,
      disagreement: 1,
      bothPending: 1,
      proceedingToFullText: 1,
      excludedAtScreening: 1,
    });
  });
});

describe("buildExclusionReasonCounts", () => {
  it("agrège les motifs d'exclusion par lecteur", () => {
    const references: ReferenceDecisionSnapshot[] = [
      {
        referenceId: "a",
        decisions: [
          { readerId: "r1", status: "EXCLUDE", exclusionReasonCode: "LANGUAGE", exclusionReasonLabel: "Langue" },
        ],
      },
      {
        referenceId: "b",
        decisions: [
          { readerId: "r1", status: "EXCLUDE", exclusionReasonCode: "LANGUAGE", exclusionReasonLabel: "Langue" },
          { readerId: "r2", status: "EXCLUDE", exclusionReasonCode: "LANGUAGE", exclusionReasonLabel: "Langue" },
        ],
      },
    ];

    expect(buildExclusionReasonCounts(references)).toEqual([
      expect.objectContaining({ readerId: "r1", reasonCode: "LANGUAGE", count: 2 }),
      expect.objectContaining({ readerId: "r2", reasonCode: "LANGUAGE", count: 1 }),
    ]);
  });
});

describe("prismaScrToCsv", () => {
  it("génère un CSV structuré avec métadonnées PRISMA-ScR", () => {
    const flow: PrismaScrFlow = {
      projectId: "proj-1",
      projectTitle: "Test project",
      generatedAt: "2026-09-02T12:00:00.000Z",
      phase: "title_abstract_screening",
      identification: {
        bySource: [{ sourceDatabase: "PubMed", recordsIdentified: 100, importBatchCount: 1 }],
        totalRecordsIdentified: 100,
      },
      deduplication: {
        duplicatesRemoved: 10,
        recordsAfterDeduplication: 90,
      },
      screening: {
        byReader: [
          {
            readerId: "r1",
            readerName: "Lecteur 1",
            pending: 80,
            retain: 5,
            exclude: 4,
            uncertain: 1,
            screened: 10,
            excluded: 4,
            proceeding: 5,
          },
        ],
        consensus: {
          bothPending: 85,
          bothRetain: 3,
          bothExclude: 2,
          bothUncertain: 0,
          disagreement: 0,
          onePending: 0,
          proceedingToFullText: 3,
          excludedAtScreening: 2,
        },
      },
      exclusionReasons: [],
      eligibility: {
        reportsProceedingFromScreening: 3,
        note: "note",
      },
      included: {
        count: 0,
        note: "note",
      },
      imports: [],
    };

    const csv = prismaScrToCsv(flow);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("total_records_identified,100");
    expect(csv).toContain("duplicates_removed,10");
    expect(csv).toContain("proceeding_to_full_text,3");
    expect(csv).toContain("PubMed");
  });
});

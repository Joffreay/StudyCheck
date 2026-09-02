import type { PrismaScrFlow } from "./prisma-scr-types";

export type SankeyStage =
  | "source"
  | "identification"
  | "deduplication"
  | "screening"
  | "eligibility";

export type SankeyNodeDef = {
  id: string;
  label: string;
  stage: SankeyStage;
};

export type SankeyLinkDef = {
  source: string;
  target: string;
  value: number;
};

export type PrismaScrSankeyGraph = {
  nodes: SankeyNodeDef[];
  links: SankeyLinkDef[];
};

export const SANKEY_NODE_COLORS: Record<SankeyStage, string> = {
  source: "#64748b",
  identification: "#0f766e",
  deduplication: "#d97706",
  screening: "#475569",
  eligibility: "#0891b2",
};

export const SANKEY_SCREENING_COLORS: Record<string, string> = {
  "screening:retain": "#059669",
  "screening:exclude": "#e11d48",
  "screening:uncertain": "#d97706",
  "screening:disagreement": "#7c3aed",
  "screening:pending": "#94a3b8",
  "dedup:removed": "#fb7185",
  "dedup:unique": "#0d9488",
};

function slugifySource(sourceDatabase: string): string {
  return sourceDatabase
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addLink(links: SankeyLinkDef[], source: string, target: string, value: number) {
  if (value <= 0) return;
  links.push({ source, target, value });
}

export function buildPrismaScrSankeyGraph(flow: PrismaScrFlow): PrismaScrSankeyGraph {
  const nodes: SankeyNodeDef[] = [];
  const links: SankeyLinkDef[] = [];

  const nodeIds = new Set<string>();
  const registerNode = (id: string, label: string, stage: SankeyStage) => {
    if (nodeIds.has(id)) return;
    nodeIds.add(id);
    nodes.push({ id, label, stage });
  };

  registerNode("total-identified", "Total identifié", "identification");
  registerNode("duplicates-removed", "Doublons retirés", "deduplication");
  registerNode("records-unique", "Records uniques", "deduplication");
  registerNode("screening-retain", "Conservées (accord)", "screening");
  registerNode("screening-exclude", "Exclues (accord)", "screening");
  registerNode("screening-uncertain", "Incertaines (accord)", "screening");
  registerNode("screening-disagreement", "Désaccord", "screening");
  registerNode("screening-pending", "En attente", "screening");
  registerNode("eligibility-full-text", "Vers texte intégral", "eligibility");

  const sources = flow.identification.bySource.filter((source) => source.recordsIdentified > 0);
  if (sources.length === 0 && flow.identification.totalRecordsIdentified > 0) {
    registerNode("source:unknown", "Imports", "source");
    addLink(
      links,
      "source:unknown",
      "total-identified",
      flow.identification.totalRecordsIdentified,
    );
  } else {
    for (const source of sources) {
      const id = `source:${slugifySource(source.sourceDatabase) || "source"}`;
      registerNode(id, source.sourceDatabase, "source");
      addLink(links, id, "total-identified", source.recordsIdentified);
    }
  }

  addLink(links, "total-identified", "duplicates-removed", flow.deduplication.duplicatesRemoved);
  addLink(
    links,
    "total-identified",
    "records-unique",
    flow.deduplication.recordsAfterDeduplication,
  );

  const consensus = flow.screening.consensus;
  addLink(links, "records-unique", "screening-retain", consensus.bothRetain);
  addLink(links, "records-unique", "screening-exclude", consensus.bothExclude);
  addLink(links, "records-unique", "screening-uncertain", consensus.bothUncertain);
  addLink(links, "records-unique", "screening-disagreement", consensus.disagreement);
  addLink(
    links,
    "records-unique",
    "screening-pending",
    consensus.bothPending + consensus.onePending,
  );

  addLink(
    links,
    "screening-retain",
    "eligibility-full-text",
    flow.eligibility.reportsProceedingFromScreening,
  );

  return { nodes, links };
}

export function getSankeyNodeColor(node: SankeyNodeDef): string {
  if (node.id === "duplicates-removed") return SANKEY_SCREENING_COLORS["dedup:removed"];
  if (node.id === "records-unique") return SANKEY_SCREENING_COLORS["dedup:unique"];
  if (node.id === "screening-retain") return SANKEY_SCREENING_COLORS["screening:retain"];
  if (node.id === "screening-exclude") return SANKEY_SCREENING_COLORS["screening:exclude"];
  if (node.id === "screening-uncertain") return SANKEY_SCREENING_COLORS["screening:uncertain"];
  if (node.id === "screening-disagreement") return SANKEY_SCREENING_COLORS["screening:disagreement"];
  if (node.id === "screening-pending") return SANKEY_SCREENING_COLORS["screening:pending"];
  return SANKEY_NODE_COLORS[node.stage];
}

export type ReferenceExportRow = {
  id: string;
  title: string;
  year: number | null;
  language: string | null;
  journal: string | null;
  doi: string | null;
  pmid: string | null;
  score: number | null;
  decisionStatus: string;
  exclusionReason: string | null;
  sources: string;
  tags: string;
  alerts: string;
  keywords: string;
  meshTerms: string;
  hasAbstract: boolean;
  infoCompleteness: number;
};

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const EXPORT_HEADERS: Array<{ key: keyof ReferenceExportRow; label: string }> = [
  { key: "id", label: "id" },
  { key: "title", label: "title" },
  { key: "year", label: "year" },
  { key: "language", label: "language" },
  { key: "journal", label: "journal" },
  { key: "doi", label: "doi" },
  { key: "pmid", label: "pmid" },
  { key: "score", label: "score" },
  { key: "decisionStatus", label: "decision_status" },
  { key: "exclusionReason", label: "exclusion_reason" },
  { key: "sources", label: "sources" },
  { key: "tags", label: "tags" },
  { key: "alerts", label: "alerts" },
  { key: "keywords", label: "keywords" },
  { key: "meshTerms", label: "mesh_terms" },
  { key: "hasAbstract", label: "has_abstract" },
  { key: "infoCompleteness", label: "info_completeness" },
];

export function referencesToCsv(rows: ReferenceExportRow[]): string {
  const lines = [
    EXPORT_HEADERS.map((header) => header.label).join(","),
    ...rows.map((row) =>
      EXPORT_HEADERS.map((header) => escapeCsvCell(row[header.key])).join(","),
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}

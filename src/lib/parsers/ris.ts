import type { ParsedReference } from "./types";
import {
  appendTerms,
  dedupeTerms,
  extractMeshFromNotes,
  normalizeMeshTerms,
} from "./term-lists";

const RIS_TAG_MAP: Record<string, keyof ParsedReference | "keyword" | "mesh" | "author" | "note"> = {
  TI: "title",
  T1: "title",
  AB: "abstract",
  N2: "abstract",
  N1: "note",
  KW: "keyword",
  K1: "keyword",
  K2: "keyword",
  MH: "mesh",
  LA: "language",
  TY: "publicationType",
  PY: "year",
  Y1: "year",
  AU: "author",
  A1: "author",
  DO: "doi",
  JO: "journal",
  JF: "journal",
  T2: "journal",
  VL: "volume",
  IS: "issue",
  SP: "pages",
  EP: "pages",
  UR: "doi",
  ID: "pmid",
  AN: "pmid",
};

function normalizeDoi(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase();
}

function parseYear(value: string): number | undefined {
  const match = value.match(/\d{4}/);
  if (!match) return undefined;
  const year = Number.parseInt(match[0], 10);
  return Number.isNaN(year) ? undefined : year;
}

function parseAuthors(value: string): ParsedReference["authors"] {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return [{ family: parts[0], given: parts.slice(1).join(", ") }];
  }
  return [{ family: value.trim() }];
}

function splitRisRecords(content: string): string[] {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*(?=TY\s+-)/)
    .map((record) => record.trim())
    .filter(Boolean);
}

function parseRisRecord(record: string): ParsedReference | null {
  const lines = record.split("\n");
  const rawRecord: Record<string, string[]> = {};
  const ref: ParsedReference = {
    title: "",
    keywords: [],
    meshTerms: [],
    authors: [],
    externalIds: {},
    rawRecord: {},
  };
  const notes: string[] = [];

  for (const line of lines) {
    const match = line.match(/^([A-Z0-9]{2})\s+-\s+(.*)$/);
    if (!match) continue;

    const [, tag, value] = match;
    const trimmed = value.trim();
    if (!rawRecord[tag]) rawRecord[tag] = [];
    rawRecord[tag].push(trimmed);

    const mapped = RIS_TAG_MAP[tag];
    if (!mapped) continue;

    switch (mapped) {
      case "title":
        ref.title = trimmed;
        break;
      case "abstract":
        ref.abstract = ref.abstract ? `${ref.abstract} ${trimmed}` : trimmed;
        break;
      case "keyword":
        ref.keywords = appendTerms(ref.keywords, [trimmed]);
        break;
      case "mesh":
        ref.meshTerms = appendTerms(ref.meshTerms, [trimmed]);
        break;
      case "note":
        notes.push(trimmed);
        break;
      case "language":
        ref.language = trimmed;
        break;
      case "publicationType":
        ref.publicationType = trimmed;
        break;
      case "year":
        ref.year = parseYear(trimmed);
        break;
      case "author":
        ref.authors.push(...parseAuthors(trimmed));
        break;
      case "doi":
        ref.doi = normalizeDoi(trimmed);
        break;
      case "journal":
        ref.journal = trimmed;
        break;
      case "volume":
        ref.volume = trimmed;
        break;
      case "issue":
        ref.issue = trimmed;
        break;
      case "pages":
        ref.pages = ref.pages ? `${ref.pages}-${trimmed}` : trimmed;
        break;
      case "pmid":
        ref.pmid = trimmed.replace(/\D/g, "");
        break;
      default:
        break;
    }
  }

  ref.meshTerms = normalizeMeshTerms([...ref.meshTerms, ...extractMeshFromNotes(notes)]);
  ref.keywords = dedupeTerms(ref.keywords);
  ref.rawRecord = rawRecord;
  if (ref.doi) ref.externalIds.doi = ref.doi;
  if (ref.pmid) ref.externalIds.pmid = ref.pmid;

  return ref.title ? ref : null;
}

export function parseRis(content: string): { references: ParsedReference[]; errors: Array<{ line?: number; message: string }> } {
  const references: ParsedReference[] = [];
  const errors: Array<{ line?: number; message: string }> = [];

  for (const record of splitRisRecords(content)) {
    try {
      const parsed = parseRisRecord(record);
      if (parsed) {
        references.push(parsed);
      } else {
        errors.push({ message: "Enregistrement RIS sans titre ignoré." });
      }
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : "Erreur de parsing RIS.",
      });
    }
  }

  return { references, errors };
}

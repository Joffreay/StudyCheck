import type { ParsedReference } from "./types";
import {
  appendTerms,
  dedupeTerms,
  normalizeMeshTerms,
  splitTermList,
  unfoldMedlineContinuations,
} from "./term-lists";

function normalizeDoi(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase();
}

function parseYear(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/\d{4}/);
  if (!match) return undefined;
  const year = Number.parseInt(match[0], 10);
  return Number.isNaN(year) ? undefined : year;
}

function parseAuthors(value?: string): ParsedReference["authors"] {
  if (!value) return [];
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const commaParts = part.split(",").map((item) => item.trim());
      if (commaParts.length >= 2) {
        return { family: commaParts[0], given: commaParts.slice(1).join(", ") };
      }
      return { family: part };
    });
}

function splitNbibRecords(content: string): string[] {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n(?=PMID-\s)/)
    .map((record) => record.trim())
    .filter(Boolean);
}

function getTaggedValue(record: string, tag: string): string | undefined {
  const regex = new RegExp(`^${tag}\\s*-?\\s+(.*)$`, "m");
  const match = record.match(regex);
  return match?.[1]?.trim();
}

function getTaggedValues(record: string, tag: string): string[] {
  const regex = new RegExp(`^${tag}\\s*-?\\s+(.*)$`, "gm");
  const matches = [...record.matchAll(regex)];
  return matches.map((match) => match[1].trim()).filter(Boolean);
}

function parseNbibRecord(record: string): ParsedReference | null {
  const unfolded = unfoldMedlineContinuations(record);
  const title = getTaggedValue(unfolded, "TI");
  if (!title) return null;

  const abstractParts = getTaggedValues(unfolded, "AB");
  const meshTerms = normalizeMeshTerms(getTaggedValues(unfolded, "MH"));
  const keywords = dedupeTerms(
    getTaggedValues(unfolded, "OT").flatMap((value) => splitTermList(value)),
  );
  const pmid = getTaggedValue(unfolded, "PMID")?.replace(/\D/g, "");
  const doiRaw = getTaggedValue(unfolded, "LID") ?? getTaggedValue(unfolded, "AID");
  const doi = doiRaw?.includes("doi") ? normalizeDoi(doiRaw.replace(/\[doi\]/i, "").trim()) : undefined;

  const parsed: ParsedReference = {
    title,
    abstract: abstractParts.length ? abstractParts.join(" ") : undefined,
    keywords,
    meshTerms,
    language: getTaggedValue(unfolded, "LA"),
    publicationType: getTaggedValues(unfolded, "PT").join("; ") || undefined,
    year: parseYear(getTaggedValue(unfolded, "DP")),
    authors: parseAuthors(getTaggedValue(unfolded, "AU") ?? getTaggedValue(unfolded, "FAU")),
    doi,
    pmid,
    journal: getTaggedValue(unfolded, "TA") ?? getTaggedValue(unfolded, "JT"),
    volume: getTaggedValue(unfolded, "VI"),
    issue: getTaggedValue(unfolded, "IP"),
    pages: getTaggedValue(unfolded, "PG"),
    sourceDatabase: "PubMed",
    externalIds: {},
    rawRecord: { nbib: record },
  };

  if (parsed.doi) parsed.externalIds.doi = parsed.doi;
  if (parsed.pmid) parsed.externalIds.pmid = parsed.pmid;

  return parsed;
}

export function parseNbib(content: string): { references: ParsedReference[]; errors: Array<{ line?: number; message: string }> } {
  const references: ParsedReference[] = [];
  const errors: Array<{ line?: number; message: string }> = [];

  for (const record of splitNbibRecords(content)) {
    try {
      const parsed = parseNbibRecord(record);
      if (parsed) {
        references.push(parsed);
      } else {
        errors.push({ message: "Enregistrement NBIB sans titre ignoré." });
      }
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : "Erreur de parsing NBIB.",
      });
    }
  }

  return { references, errors };
}

export { appendTerms as appendNbibTerms };

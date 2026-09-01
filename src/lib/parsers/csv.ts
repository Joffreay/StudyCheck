import type { CsvColumnMapping, ParsedReference } from "./types";
import { DEFAULT_CSV_MAPPING } from "./types";

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
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
    .split(/[;|]/)
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

function normalizeDoi(value?: string): string | undefined {
  if (!value) return undefined;
  return value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase();
}

export function parseCsv(
  content: string,
  mapping: CsvColumnMapping = DEFAULT_CSV_MAPPING,
): { references: ParsedReference[]; errors: Array<{ line?: number; message: string }> } {
  const references: ParsedReference[] = [];
  const errors: Array<{ line?: number; message: string }> = [];

  const lines = content.replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    return { references, errors: [{ message: "CSV vide ou sans en-tête." }] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  function getCell(row: string[], column?: string): string | undefined {
    if (!column) return undefined;
    const index = headerIndex.get(normalizeHeader(column));
    if (index === undefined) return undefined;
    return row[index]?.trim() || undefined;
  }

  for (let lineNumber = 1; lineNumber < lines.length; lineNumber += 1) {
    const row = splitCsvLine(lines[lineNumber], delimiter);
    if (row.every((cell) => !cell.trim())) continue;

    try {
      const title = getCell(row, mapping.title);
      if (!title) {
        errors.push({ line: lineNumber + 1, message: "Ligne CSV sans titre ignorée." });
        continue;
      }

      const doi = normalizeDoi(getCell(row, mapping.doi));
      const pmid = getCell(row, mapping.pmid)?.replace(/\D/g, "");
      const parsed: ParsedReference = {
        title,
        abstract: getCell(row, mapping.abstract),
        keywords: parseList(getCell(row, mapping.keywords)),
        meshTerms: parseList(getCell(row, mapping.meshTerms)),
        language: getCell(row, mapping.language),
        publicationType: getCell(row, mapping.publicationType),
        year: parseYear(getCell(row, mapping.year)),
        authors: parseAuthors(getCell(row, mapping.authors)),
        doi,
        pmid,
        journal: getCell(row, mapping.journal),
        volume: getCell(row, mapping.volume),
        issue: getCell(row, mapping.issue),
        pages: getCell(row, mapping.pages),
        externalIds: {},
        rawRecord: Object.fromEntries(
          headers.map((header, index) => [header, row[index] ?? ""]),
        ),
      };

      if (doi) parsed.externalIds.doi = doi;
      if (pmid) parsed.externalIds.pmid = pmid;

      references.push(parsed);
    } catch (error) {
      errors.push({
        line: lineNumber + 1,
        message: error instanceof Error ? error.message : "Erreur de parsing CSV.",
      });
    }
  }

  return { references, errors };
}

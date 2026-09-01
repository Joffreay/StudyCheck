import { parseCsv } from "./csv";
import { parseNbib } from "./nbib";
import { parseRis } from "./ris";
import type { CsvColumnMapping, ImportFormat, ParseResult } from "./types";

export function parseBibliographicFile(
  content: string,
  format: ImportFormat,
  csvMapping?: CsvColumnMapping,
): ParseResult {
  switch (format) {
    case "RIS":
      return parseRis(content);
    case "NBIB":
      return parseNbib(content);
    case "CSV":
      return parseCsv(content, csvMapping);
    default:
      return { references: [], errors: [{ message: `Format non supporté: ${format}` }] };
  }
}

export * from "./types";
export { parseRis } from "./ris";
export { parseNbib } from "./nbib";
export { parseCsv } from "./csv";

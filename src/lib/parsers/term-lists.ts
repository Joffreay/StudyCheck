/** Sépare une valeur contenant plusieurs termes (ex. « term1; term2 »). */
export function splitTermList(value: string): string[] {
  return value
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Normalise un descripteur MeSH PubMed (marqueur *, sous-titre /). */
export function normalizeMeshTerm(term: string): string {
  return term
    .trim()
    .replace(/^\*+/, "")
    .replace(/\/\*?/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMeshTerms(terms: string[]): string[] {
  return dedupeTerms(terms.map(normalizeMeshTerm));
}

export function dedupeTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const term of terms) {
    const trimmed = term.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export function appendTerms(existing: string[], values: string[]): string[] {
  return dedupeTerms([...existing, ...values.flatMap((value) => splitTermList(value))]);
}

/** Replie les lignes de continuation MEDLINE/NBIB (6 espaces). */
export function unfoldMedlineContinuations(content: string): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const result: string[] = [];

  for (const line of lines) {
    if (line.startsWith("      ") && result.length > 0) {
      result[result.length - 1] += ` ${line.trim()}`;
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
}

const MESH_NOTE_PATTERN = /(?:MeSH|MESH)\s*(?:Terms?|Headings?|descriptors?)?\s*[:：]\s*(.+)$/i;

/** Extrait des descripteurs MeSH depuis une note RIS (export Zotero / EndNote). */
export function extractMeshFromNotes(notes: string[]): string[] {
  const terms: string[] = [];

  for (const note of notes) {
    const match = note.match(MESH_NOTE_PATTERN);
    if (match) {
      terms.push(...splitTermList(match[1]));
    }
  }

  return terms;
}

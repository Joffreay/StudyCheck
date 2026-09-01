import type { MatchSpan, ScoringField } from "./types";

const NEGATION_PATTERN =
  /\b(?:no|not|without|neither|nor|sans|pas de|aucun|aucune)\b/i;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getFieldTexts(reference: {
  title: string;
  abstract?: string | null;
  keywords: string[];
  meshTerms: string[];
}): Record<ScoringField, string> {
  return {
    title: reference.title ?? "",
    abstract: reference.abstract ?? "",
    keywords: reference.keywords.join("; "),
    mesh: reference.meshTerms.join("; "),
  };
}

export function findTermMatch(
  fieldText: string,
  term: string,
): { matchedText: string; span: MatchSpan; negated: boolean } | null {
  if (!fieldText.trim() || !term.trim()) return null;

  const normalizedText = normalizeForMatch(fieldText);
  const normalizedTerm = normalizeForMatch(term);
  const pattern = normalizedTerm.includes(" ")
    ? escapeRegex(normalizedTerm)
    : `\\b${escapeRegex(normalizedTerm)}\\b`;

  const regex = new RegExp(pattern, "i");
  const match = regex.exec(normalizedText);
  if (!match || match.index === undefined) return null;

  const start = match.index;
  const end = start + match[0].length;
  const matchedText = fieldText.slice(start, end) || match[0];

  const contextStart = Math.max(0, start - 40);
  const context = normalizedText.slice(contextStart, start);
  const negated = NEGATION_PATTERN.test(context);

  return {
    matchedText,
    span: { start, end, matchedText },
    negated,
  };
}

export function termMatchesAnyField(
  fields: Record<ScoringField, string>,
  allowedFields: ScoringField[],
  term: string,
): Array<{ field: ScoringField; matchedText: string; span: MatchSpan; negated: boolean }> {
  const matches: Array<{ field: ScoringField; matchedText: string; span: MatchSpan; negated: boolean }> = [];

  for (const field of allowedFields) {
    const result = findTermMatch(fields[field], term);
    if (result) {
      matches.push({ field, ...result });
    }
  }

  return matches;
}

export function hasBroadMeshDrama(meshTerms: string[]): boolean {
  if (meshTerms.length === 0) return false;
  const normalized = meshTerms.map(normalizeForMatch);
  const hasDrama = normalized.some((term) => term === "drama" || term.startsWith("drama,"));
  const hasImprovSignal = normalized.some((term) => term.includes("improv"));
  return hasDrama && !hasImprovSignal && meshTerms.length <= 2;
}

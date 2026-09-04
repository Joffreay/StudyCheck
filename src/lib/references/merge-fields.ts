import type { ParsedReference } from "@/lib/parsers/types";
import { normalizeDoi, normalizePmid } from "@/lib/references/normalize";

export type MergeableReference = {
  title: string;
  abstract: string | null;
  keywords: string[];
  meshTerms: string[];
  language: string | null;
  publicationType: string | null;
  year: number | null;
  authors: unknown;
  doi: string | null;
  pmid: string | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
};

function asIncoming(reference: MergeableReference): ParsedReference {
  return {
    title: reference.title,
    abstract: reference.abstract ?? undefined,
    keywords: reference.keywords,
    meshTerms: reference.meshTerms,
    language: reference.language ?? undefined,
    publicationType: reference.publicationType ?? undefined,
    year: reference.year ?? undefined,
    authors: reference.authors as ParsedReference["authors"],
    doi: reference.doi ?? undefined,
    pmid: reference.pmid ?? undefined,
    journal: reference.journal ?? undefined,
    volume: reference.volume ?? undefined,
    issue: reference.issue ?? undefined,
    pages: reference.pages ?? undefined,
    externalIds: {},
    rawRecord: {},
  };
}

export function mergeReferenceFields(
  existing: MergeableReference,
  incoming: MergeableReference | ParsedReference,
): MergeableReference {
  const parsed = "rawRecord" in incoming ? incoming : asIncoming(incoming);
  const abstract =
    (existing.abstract?.length ?? 0) >= (parsed.abstract?.length ?? 0)
      ? existing.abstract
      : parsed.abstract ?? existing.abstract;

  return {
    title: existing.title || parsed.title,
    abstract: abstract ?? null,
    keywords: Array.from(new Set([...existing.keywords, ...parsed.keywords])),
    meshTerms: Array.from(new Set([...existing.meshTerms, ...parsed.meshTerms])),
    language: existing.language ?? parsed.language ?? null,
    publicationType: existing.publicationType ?? parsed.publicationType ?? null,
    year: existing.year ?? parsed.year ?? null,
    authors: existing.authors ?? parsed.authors,
    doi: existing.doi ?? normalizeDoi(parsed.doi) ?? null,
    pmid: existing.pmid ?? normalizePmid(parsed.pmid) ?? null,
    journal: existing.journal ?? parsed.journal ?? null,
    volume: existing.volume ?? parsed.volume ?? null,
    issue: existing.issue ?? parsed.issue ?? null,
    pages: existing.pages ?? parsed.pages ?? null,
  };
}

export function pickPrimaryReferenceId(
  references: Array<{ id: string; infoCompleteness: number; sourceCount: number }>,
): string {
  const sorted = [...references].sort((a, b) => {
    if (b.infoCompleteness !== a.infoCompleteness) {
      return b.infoCompleteness - a.infoCompleteness;
    }
    return b.sourceCount - a.sourceCount;
  });

  return sorted[0]?.id ?? references[0].id;
}

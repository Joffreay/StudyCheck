export function normalizeDoi(doi?: string | null): string | undefined {
  if (!doi) return undefined;
  const normalized = doi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase();
  return normalized || undefined;
}

export function normalizePmid(pmid?: string | null): string | undefined {
  if (!pmid) return undefined;
  const digits = pmid.replace(/\D/g, "");
  return digits || undefined;
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCanonicalKey(input: {
  doi?: string | null;
  pmid?: string | null;
  title: string;
  year?: number | null;
}): string {
  const doi = normalizeDoi(input.doi);
  if (doi) return `doi:${doi}`;

  const pmid = normalizePmid(input.pmid);
  if (pmid) return `pmid:${pmid}`;

  const title = normalizeTitle(input.title);
  const year = input.year ?? "na";
  return `title:${title}|year:${year}`;
}

export function computeInfoCompleteness(input: {
  hasAbstract: boolean;
  keywordsCount: number;
  meshCount: number;
  hasDoi: boolean;
  hasPmid: boolean;
}): number {
  let score = 40;
  if (input.hasAbstract) score += 35;
  if (input.keywordsCount > 0) score += 10;
  if (input.meshCount > 0) score += 10;
  if (input.hasDoi || input.hasPmid) score += 5;
  return Math.min(score, 100);
}

export function buildInfoGapFlags(input: {
  hasAbstract: boolean;
  keywordsCount: number;
  meshCount: number;
}): string[] {
  const flags: string[] = [];
  if (!input.hasAbstract) flags.push("NO_ABSTRACT");
  if (input.keywordsCount === 0) flags.push("NO_KEYWORDS");
  if (input.meshCount === 0) flags.push("NO_MESH");
  return flags;
}

import { PrismaClient } from "@prisma/client";
import { parseNbib } from "../src/lib/parsers/nbib";
import { parseRis } from "../src/lib/parsers/ris";
import type { ParsedReference } from "../src/lib/parsers/types";
import {
  buildInfoGapFlags,
  computeInfoCompleteness,
} from "../src/lib/references/normalize";

const prisma = new PrismaClient();

function parseFromRawRecord(rawRecord: Record<string, unknown>): ParsedReference | null {
  if (typeof rawRecord.nbib === "string") {
    return parseNbib(rawRecord.nbib).references[0] ?? null;
  }

  const risTags = Object.keys(rawRecord);
  if (risTags.includes("TI") || risTags.includes("TY")) {
    const lines = ["TY  - JOUR"];
    for (const [tag, values] of Object.entries(rawRecord)) {
      if (!Array.isArray(values)) continue;
      for (const value of values) {
        lines.push(`${tag}  - ${value}`);
      }
    }
    lines.push("ER  - ");
    return parseRis(lines.join("\n")).references[0] ?? null;
  }

  return null;
}

function mergeParsed(items: ParsedReference[]): ParsedReference | null {
  if (items.length === 0) return null;

  return items.reduce<ParsedReference>((acc, item) => ({
    ...acc,
    title: acc.title || item.title,
    abstract: (acc.abstract?.length ?? 0) >= (item.abstract?.length ?? 0) ? acc.abstract : item.abstract,
    keywords: Array.from(new Set([...acc.keywords, ...item.keywords])),
    meshTerms: Array.from(new Set([...acc.meshTerms, ...item.meshTerms])),
    language: acc.language ?? item.language,
    publicationType: acc.publicationType ?? item.publicationType,
    year: acc.year ?? item.year,
    authors: acc.authors.length ? acc.authors : item.authors,
    doi: acc.doi ?? item.doi,
    pmid: acc.pmid ?? item.pmid,
    journal: acc.journal ?? item.journal,
    volume: acc.volume ?? item.volume,
    issue: acc.issue ?? item.issue,
    pages: acc.pages ?? item.pages,
    externalIds: { ...acc.externalIds, ...item.externalIds },
    rawRecord: acc.rawRecord,
  }), items[0]);
}

async function main() {
  const references = await prisma.reference.findMany({
    include: { sources: true },
  });

  let updated = 0;

  for (const reference of references) {
    const parsedItems = reference.sources
      .map((source) => parseFromRawRecord(source.rawRecord as Record<string, unknown>))
      .filter((item): item is ParsedReference => item !== null);

    const merged = mergeParsed(parsedItems);
    if (!merged) continue;

    const keywordsCount = merged.keywords.length;
    const meshCount = merged.meshTerms.length;
    const hasAbstract = Boolean((merged.abstract ?? reference.abstract)?.trim());

    await prisma.reference.update({
      where: { id: reference.id },
      data: {
        keywords: merged.keywords,
        meshTerms: merged.meshTerms,
        infoCompleteness: computeInfoCompleteness({
          hasAbstract,
          keywordsCount,
          meshCount,
          hasDoi: Boolean(reference.doi),
          hasPmid: Boolean(reference.pmid),
        }),
        infoGapFlags: buildInfoGapFlags({ hasAbstract, keywordsCount, meshCount }),
      },
    });

    updated += 1;
    console.log(reference.title.slice(0, 50), "→", meshCount, "MeSH,", keywordsCount, "KW");
  }

  if (updated > 0) {
    const { rescoreReferences } = await import("../src/lib/scoring/service");
    await rescoreReferences(references.map((ref) => ref.id));
  }

  console.log(`\n${updated} référence(s) retraitée(s).`);
}

main().finally(() => prisma.$disconnect());

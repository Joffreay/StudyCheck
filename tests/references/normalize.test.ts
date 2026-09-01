import { describe, expect, it } from "vitest";
import {
  buildCanonicalKey,
  buildInfoGapFlags,
  computeInfoCompleteness,
  normalizeDoi,
  normalizeTitle,
} from "@/lib/references/normalize";

describe("normalize bibliographic helpers", () => {
  it("normalise les DOI", () => {
    expect(normalizeDoi("https://doi.org/10.1000/ABC")).toBe("10.1000/abc");
  });

  it("construit une clé canonique prioritaire DOI puis PMID", () => {
    expect(
      buildCanonicalKey({
        doi: "10.1000/abc",
        pmid: "123",
        title: "Example",
        year: 2024,
      }),
    ).toBe("doi:10.1000/abc");

    expect(
      buildCanonicalKey({
        pmid: "123",
        title: "Example",
        year: 2024,
      }),
    ).toBe("pmid:123");
  });

  it("normalise les titres pour la déduplication probable", () => {
    expect(normalizeTitle("Théâtre-forum: une étude")).toBe("theatre forum une etude");
  });

  it("sépare complétude informationnelle et pertinence", () => {
    expect(
      computeInfoCompleteness({
        hasAbstract: false,
        keywordsCount: 2,
        meshCount: 1,
        hasDoi: true,
        hasPmid: false,
      }),
    ).toBe(65);

    expect(
      buildInfoGapFlags({
        hasAbstract: false,
        keywordsCount: 0,
        meshCount: 0,
      }),
    ).toEqual(["NO_ABSTRACT", "NO_KEYWORDS", "NO_MESH"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  clusterReferencesByNormalizedTitle,
  filterDuplicateClusters,
  isEligibleTitleForDuplicateDetection,
  shouldCreateDuplicateGroup,
} from "@/lib/duplicates/title-detection";
import { mergeReferenceFields, pickPrimaryReferenceId } from "@/lib/references/merge-fields";

describe("title duplicate detection", () => {
  it("ignore les titres trop courts", () => {
    expect(isEligibleTitleForDuplicateDetection("short title")).toBe(false);
    expect(isEligibleTitleForDuplicateDetection("improvisation theatre sante")).toBe(true);
  });

  it("regroupe les références au titre normalisé identique", () => {
    const clusters = filterDuplicateClusters(
      clusterReferencesByNormalizedTitle([
        {
          id: "a",
          titleNormalized: "medical improv workshop for students",
          duplicateGroupId: null,
        },
        {
          id: "b",
          titleNormalized: "medical improv workshop for students",
          duplicateGroupId: null,
        },
        {
          id: "c",
          titleNormalized: "another unique title here",
          duplicateGroupId: null,
        },
      ]),
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0].references.map((reference) => reference.id)).toEqual(["a", "b"]);
  });

  it("ne recrée pas un groupe déjà ouvert couvrant toutes les références", () => {
    expect(
      shouldCreateDuplicateGroup([
        { id: "a", titleNormalized: "x", duplicateGroupId: "g1", duplicateGroupStatus: "OPEN" },
        { id: "b", titleNormalized: "x", duplicateGroupId: "g1", duplicateGroupStatus: "OPEN" },
      ]),
    ).toBe(false);
  });

  it("choisit la référence la plus complète comme principale", () => {
    expect(
      pickPrimaryReferenceId([
        { id: "a", infoCompleteness: 65, sourceCount: 1 },
        { id: "b", infoCompleteness: 90, sourceCount: 2 },
      ]),
    ).toBe("b");
  });

  it("fusionne les champs bibliographiques", () => {
    const merged = mergeReferenceFields(
      {
        title: "Title A",
        abstract: "Short",
        keywords: ["a"],
        meshTerms: [],
        language: "eng",
        publicationType: null,
        year: 2020,
        authors: null,
        doi: null,
        pmid: null,
        journal: null,
        volume: null,
        issue: null,
        pages: null,
      },
      {
        title: "",
        abstract: "A much longer abstract with more detail",
        keywords: ["b"],
        meshTerms: ["Humans"],
        language: null,
        publicationType: "Journal Article",
        year: null,
        authors: null,
        doi: "10.1000/test",
        pmid: null,
        journal: "Med Educ",
        volume: null,
        issue: null,
        pages: null,
      },
    );

    expect(merged.abstract).toContain("longer abstract");
    expect(merged.keywords).toEqual(["a", "b"]);
    expect(merged.doi).toBe("10.1000/test");
    expect(merged.journal).toBe("Med Educ");
  });
});

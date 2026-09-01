import { describe, expect, it } from "vitest";
import { referencesToCsv } from "@/lib/export/references-csv";

describe("referencesToCsv", () => {
  it("génère un CSV UTF-8 avec en-têtes et échappement", () => {
    const csv = referencesToCsv([
      {
        id: "ref-1",
        title: 'Dramatherapy, "psychosis" and care',
        year: 2024,
        language: "eng",
        journal: null,
        doi: "10.1000/example",
        pmid: null,
        score: 58,
        decisionStatus: "À examiner",
        exclusionReason: null,
        sources: "PubMed",
        tags: "Co-intervention potentielle",
        alerts: "NO_ABSTRACT",
        keywords: "dramatherapy",
        meshTerms: "Humans",
        hasAbstract: true,
        infoCompleteness: 90,
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("title,year,language");
    expect(csv).toContain('"Dramatherapy, ""psychosis"" and care"');
    expect(csv).toContain("58");
  });
});

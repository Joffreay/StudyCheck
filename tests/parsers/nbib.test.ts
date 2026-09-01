import { describe, expect, it } from "vitest";
import { parseNbib } from "@/lib/parsers/nbib";
import { SAMPLE_NBIB, SAMPLE_NBIB_CONTINUATION } from "../fixtures/bibliographic";

describe("parseNbib", () => {
  it("parse les enregistrements PubMed NBIB", () => {
    const result = parseNbib(SAMPLE_NBIB);
    expect(result.references).toHaveLength(2);
    expect(result.references[0].title).toBe("Applied improvisation in medical education");
    expect(result.references[0].pmid).toBe("12345678");
    expect(result.references[0].meshTerms).toContain("Education, Medical");
    expect(result.references[0].doi).toBe("10.1000/example.pmid");
    expect(result.references[0].sourceDatabase).toBe("PubMed");
  });

  it("conserve le texte NBIB brut", () => {
    const result = parseNbib(SAMPLE_NBIB);
    expect(result.references[0].rawRecord.nbib).toContain("PMID- 12345678");
  });

  it("replie les lignes MeSH continuées et normalise les descripteurs", () => {
    const result = parseNbib(SAMPLE_NBIB_CONTINUATION);
    expect(result.references[0].meshTerms).toContain("Psychotic Disorders / therapy");
    expect(result.references[0].keywords).toEqual(["psychodrama", "drama therapy"]);
  });
});

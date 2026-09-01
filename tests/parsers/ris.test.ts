import { describe, expect, it } from "vitest";
import { parseRis } from "@/lib/parsers/ris";
import { SAMPLE_RIS, SAMPLE_RIS_SEMICOLON_KW, SAMPLE_RIS_ZOTERO } from "../fixtures/bibliographic";

describe("parseRis", () => {
  it("parse plusieurs enregistrements RIS", () => {
    const result = parseRis(SAMPLE_RIS);
    expect(result.references).toHaveLength(2);
    expect(result.references[0].title).toBe("Medical improv for nursing students");
    expect(result.references[0].keywords).toEqual(["improvisation", "nursing student"]);
    expect(result.references[0].doi).toBe("10.1000/example.doi");
    expect(result.references[0].year).toBe(2024);
  });

  it("conserve l'enregistrement brut", () => {
    const result = parseRis(SAMPLE_RIS);
    expect(result.references[0].rawRecord).toHaveProperty("TI");
  });

  it("récupère MeSH depuis une note et des KW style Zotero", () => {
    const result = parseRis(SAMPLE_RIS_ZOTERO);
    expect(result.references[0].meshTerms).toEqual(
      expect.arrayContaining(["Education, Medical", "Humans"]),
    );
    expect(result.references[0].keywords).toEqual(
      expect.arrayContaining(["Education, Medical", "Humans", "improvisation", "medical student"]),
    );
  });

  it("sépare les KW multiples sur une seule ligne", () => {
    const result = parseRis(SAMPLE_RIS_SEMICOLON_KW);
    expect(result.references[0].keywords).toEqual(["drama", "improvisation", "nursing"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  extractMeshFromNotes,
  normalizeMeshTerm,
  splitTermList,
  unfoldMedlineContinuations,
} from "@/lib/parsers/term-lists";

describe("term-lists", () => {
  it("normalise les descripteurs MeSH PubMed", () => {
    expect(normalizeMeshTerm("*Psychotic Disorders/therapy")).toBe("Psychotic Disorders / therapy");
    expect(normalizeMeshTerm("Art Therapy/*methods")).toBe("Art Therapy / methods");
  });

  it("déplie les lignes de continuation MEDLINE", () => {
    const input = `TI  - Long title on two
      lines of title
MH  - Education, Medical
      /methods`;
    const unfolded = unfoldMedlineContinuations(input);
    expect(unfolded).toContain("TI  - Long title on two lines of title");
    expect(unfolded).toContain("MH  - Education, Medical /methods");
  });

  it("sépare les listes séparées par point-virgule", () => {
    expect(splitTermList("improvisation; nursing student")).toEqual(["improvisation", "nursing student"]);
  });

  it("extrait MeSH depuis une note RIS", () => {
    expect(
      extractMeshFromNotes(["MeSH Terms: Humans; *Drama; Education, Medical"]),
    ).toEqual(["Humans", "*Drama", "Education, Medical"]);
  });
});

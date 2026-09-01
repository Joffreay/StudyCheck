import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/parsers/csv";
import { SAMPLE_CSV } from "../fixtures/bibliographic";

describe("parseCsv", () => {
  it("parse un CSV avec en-têtes standard", () => {
    const result = parseCsv(SAMPLE_CSV);
    expect(result.references).toHaveLength(2);
    expect(result.references[0].title).toBe("Medical improv elective");
    expect(result.references[0].keywords).toEqual(["improvisation", "medical student"]);
    expect(result.references[0].meshTerms).toEqual(["Education, Medical"]);
    expect(result.references[0].doi).toBe("10.1000/csv.doi");
    expect(result.references[0].pmid).toBe("99999999");
  });

  it("ignore les lignes sans titre", () => {
    const csv = `title,abstract\n,empty title\nValid title,Abstract`;
    const result = parseCsv(csv);
    expect(result.references).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
  });
});

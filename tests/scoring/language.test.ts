import { describe, expect, it } from "vitest";
import { isAllowedScreeningLanguage, shouldAutoExcludeForLanguage } from "@/lib/scoring/language";

describe("language screening", () => {
  it("accepte français et anglais (codes PubMed inclus)", () => {
    expect(isAllowedScreeningLanguage("eng")).toBe(true);
    expect(isAllowedScreeningLanguage("fre")).toBe(true);
    expect(isAllowedScreeningLanguage("en")).toBe(true);
    expect(isAllowedScreeningLanguage("fr")).toBe(true);
    expect(isAllowedScreeningLanguage("English")).toBe(true);
    expect(isAllowedScreeningLanguage("français")).toBe(true);
  });

  it("refuse les autres langues renseignées", () => {
    expect(isAllowedScreeningLanguage("ger")).toBe(false);
    expect(isAllowedScreeningLanguage("spa")).toBe(false);
    expect(isAllowedScreeningLanguage("de")).toBe(false);
  });

  it("ne déclenche pas d'exclusion si la langue est absente", () => {
    expect(shouldAutoExcludeForLanguage(null)).toBe(false);
    expect(shouldAutoExcludeForLanguage("")).toBe(false);
    expect(shouldAutoExcludeForLanguage("   ")).toBe(false);
  });

  it("déclenche une exclusion directe pour une langue non autorisée", () => {
    expect(shouldAutoExcludeForLanguage("ger")).toBe(true);
    expect(shouldAutoExcludeForLanguage("ita")).toBe(true);
  });
});

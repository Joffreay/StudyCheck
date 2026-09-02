import { describe, expect, it } from "vitest";
import { loadScoringConfig, resetScoringConfigCache } from "@/lib/scoring/config";
import { scoreReference } from "@/lib/scoring/engine";
import type { ReferenceForScoring, ScoringConfig } from "@/lib/scoring/types";

const minimalConfig: ScoringConfig = {
  version: "test",
  status: "test",
  fieldMultipliers: { title: 3, abstract: 1.5, keywords: 2, mesh: 2.5, publicationType: 2 },
  subscoreCaps: { intervention: 40, population: 30, pedagogical: 20, noise: -30 },
  normalization: { rawMin: 0, rawMax: 120, outputMin: 0, outputMax: 100 },
  alerts: [
    { id: "NO_ABSTRACT", condition: "missingAbstract" },
    { id: "BROAD_MESH_DRAMA", condition: "broadMeshDrama" },
  ],
  tags: {
    CO_INTERVENTION_POTENTIAL: {
      label: "Co-intervention potentielle",
      terms: ["simulation", "OSCE"],
      scoreEffect: "none",
    },
  },
  rules: [
    {
      id: "INT_IMPROVISATION",
      subscore: "intervention",
      weight: 12,
      terms: ["improvisation", "improv"],
      fields: ["title", "abstract", "keywords", "mesh"],
    },
    {
      id: "POP_MEDICAL_STUDENT",
      subscore: "population",
      weight: 10,
      terms: ["medical student"],
      fields: ["title", "abstract", "keywords", "mesh"],
    },
    {
      id: "NOISE_MUSIC",
      subscore: "noise",
      weight: -10,
      terms: ["jazz"],
      fields: ["title", "abstract"],
    },
  ],
  combinations: [
    {
      id: "COMBO",
      requireAll: ["INT_IMPROVISATION", "POP_MEDICAL_STUDENT"],
      bonus: 5,
      subscore: "intervention",
    },
  ],
};

describe("scoreReference", () => {
  it("n'attribue qu'une contribution par règle et par champ malgré les répétitions", () => {
    const result = scoreReference(
      {
        title: "Medical improv workshop",
        abstract:
          "Improvisation improvisation improvisation for medical students. Improvisation again.",
        keywords: [],
        meshTerms: [],
        hasAbstract: true,
      },
      minimalConfig,
    );

    const abstractRuleHits = result.triggeredRules.filter(
      (rule) => rule.ruleId === "INT_IMPROVISATION" && rule.field === "abstract",
    );
    expect(abstractRuleHits).toHaveLength(1);
    expect(abstractRuleHits[0].contribution).toBe(12 * 1.5);
  });

  it("détecte une expression composée sans confondre avec un mot isolé", () => {
    const composed = scoreReference(
      {
        title: "Applied improvisation in health education",
        abstract: "",
        keywords: [],
        meshTerms: [],
        hasAbstract: false,
      },
      minimalConfig,
    );

    const isolated = scoreReference(
      {
        title: "Improv class",
        abstract: "",
        keywords: [],
        meshTerms: [],
        hasAbstract: false,
      },
      minimalConfig,
    );

    expect(composed.triggeredRules.some((rule) => rule.matchedTerm === "improvisation")).toBe(true);
    expect(isolated.triggeredRules.some((rule) => rule.matchedTerm === "improv")).toBe(true);
  });

  it("ignore une contribution négée", () => {
    const result = scoreReference(
      {
        title: "Workshop without improvisation for clinicians",
        abstract: "",
        keywords: [],
        meshTerms: [],
        hasAbstract: false,
      },
      minimalConfig,
    );

    const rule = result.triggeredRules.find((item) => item.ruleId === "INT_IMPROVISATION");
    expect(rule?.negated).toBe(true);
    expect(rule?.contribution).toBe(0);
  });

  it("additionne les champs distincts pour la même règle", () => {
    const result = scoreReference(
      {
        title: "Improvisation workshop",
        abstract: "Uses improvisation exercises",
        keywords: [],
        meshTerms: [],
        hasAbstract: true,
      },
      minimalConfig,
    );

    const titleHit = result.triggeredRules.find(
      (rule) => rule.ruleId === "INT_IMPROVISATION" && rule.field === "title",
    );
    const abstractHit = result.triggeredRules.find(
      (rule) => rule.ruleId === "INT_IMPROVISATION" && rule.field === "abstract",
    );

    expect(titleHit?.contribution).toBe(12 * 3);
    expect(abstractHit?.contribution).toBe(12 * 1.5);
  });

  it("signale l'absence de résumé sans pénaliser le score de pertinence", () => {
    const withAbstract = scoreReference(
      {
        title: "Improvisation for medical students",
        abstract: "Medical students practiced improv.",
        keywords: [],
        meshTerms: [],
        hasAbstract: true,
      },
      minimalConfig,
    );

    const withoutAbstract = scoreReference(
      {
        title: "Improvisation for medical students",
        abstract: null,
        keywords: [],
        meshTerms: [],
        hasAbstract: false,
      },
      minimalConfig,
    );

    expect(withoutAbstract.alerts).toContain("NO_ABSTRACT");
    expect(withoutAbstract.scoreTotal).toBeGreaterThan(0);
    expect(withoutAbstract.scoreTotal).toBeGreaterThanOrEqual(withAbstract.scoreTotal - 5);
  });

  it("coexiste signaux positifs et bruit sans exclusion automatique", () => {
    const result = scoreReference(
      {
        title: "Jazz improvisation for medical students",
        abstract: "",
        keywords: [],
        meshTerms: [],
        hasAbstract: false,
      },
      minimalConfig,
    );

    expect(result.subscores.intervention).toBeGreaterThan(0);
    expect(result.subscores.noise).toBeLessThan(0);
    expect(result.scoreTotal).toBeGreaterThan(0);
  });

  it("alerte sur un MeSH Drama très large sans signal d'improvisation", () => {
    const result = scoreReference(
      {
        title: "Historical drama in medicine",
        abstract: "",
        keywords: [],
        meshTerms: ["Drama"],
        hasAbstract: false,
      },
      minimalConfig,
    );

    expect(result.alerts).toContain("BROAD_MESH_DRAMA");
  });

  it("applique un tag de co-intervention sans pénalité", () => {
    const result = scoreReference(
      {
        title: "Simulation and OSCE for nursing students",
        abstract: "",
        keywords: [],
        meshTerms: [],
        hasAbstract: false,
      },
      minimalConfig,
    );

    expect(result.triggeredTags.some((tag) => tag.tagCode === "CO_INTERVENTION_POTENTIAL")).toBe(true);
    expect(result.subscores.noise).toBe(0);
  });

  it("charge la configuration Rayyan réelle v0.2.0", () => {
    resetScoringConfigCache();
    const config = loadScoringConfig("v0.2.0");
    expect(config.rules.length).toBeGreaterThan(20);
    expect(config.tags.CO_INTERVENTION_POTENTIAL).toBeDefined();
    expect(config.rules.some((rule) => rule.id === "INT_IMPROVISATION_FR")).toBe(true);
    expect(config.rules.some((rule) => rule.id === "DOC_REVIEW")).toBe(true);
    expect(config.fieldMultipliers.publicationType).toBe(2);
    expect(config.directExclusions?.some((rule) => rule.id === "NON_FR_EN_LANGUAGE")).toBe(true);
  });

  it("exclut directement une référence dont la langue n'est ni français ni anglais", () => {
    const config = {
      ...minimalConfig,
      directExclusions: [
        {
          id: "NON_FR_EN_LANGUAGE",
          condition: "languageNotFrEn" as const,
          exclusionReasonCode: "LANGUAGE",
          label: "Langue hors français/anglais",
        },
      ],
    };

    const german = scoreReference(
      {
        title: "Improvisation für Medizinstudenten",
        abstract: "",
        keywords: [],
        meshTerms: [],
        language: "ger",
        hasAbstract: false,
      },
      config,
    );

    const english = scoreReference(
      {
        title: "Improvisation for medical students",
        abstract: "",
        keywords: [],
        meshTerms: [],
        language: "eng",
        hasAbstract: false,
      },
      config,
    );

    expect(german.directExclusion?.id).toBe("NON_FR_EN_LANGUAGE");
    expect(german.alerts).toContain("NON_FR_EN_LANGUAGE");
    expect(english.directExclusion).toBeNull();
  });

  it("pénalise une revue systématique tout en conservant le signal dramatherapy", () => {
    resetScoringConfigCache();
    const config = loadScoringConfig("v0.2.0");

    const result = scoreReference(
      {
        title: "A systematic review of dramatherapy interventions used to support adults with psychosis.",
        abstract:
          "Dramatherapy is often utilised in health services with this population. " +
          "Positive effects include improved relationships and reduced psychotic symptoms.",
        keywords: [
          "Adult mental health",
          "Arts psychotherapies",
          "Dramatherapy",
          "Psychiatry",
          "Psychosis",
          "Systematic review",
        ],
        meshTerms: ["Humans", "Psychotic Disorders / therapy", "Adult"],
        language: "eng",
        hasAbstract: true,
      },
      config,
    );

    expect(result.triggeredRules.some((rule) => rule.ruleId === "INT_DRAMA_THERAPY")).toBe(true);
    expect(result.triggeredRules.some((rule) => rule.ruleId === "POP_MENTAL_HEALTH")).toBe(true);
    expect(result.triggeredRules.some((rule) => rule.ruleId === "DOC_REVIEW")).toBe(true);
    expect(result.alerts).toContain("DOC_REVIEW");
    expect(result.subscores.noise).toBeLessThan(0);
    expect(result.triggeredTags.some((tag) => tag.tagCode === "RELATED_INTERVENTION_CONTINGENCY")).toBe(true);
  });

  it("détecte les termes français d'improvisation théâtrale", () => {
    resetScoringConfigCache();
    const config = loadScoringConfig("v0.2.0");

    const result = scoreReference(
      {
        title: "Improvisation théâtrale pour étudiants en médecine",
        abstract: "Atelier de théâtre d'improvisation en formation continue.",
        keywords: [],
        meshTerms: [],
        language: "fre",
        hasAbstract: true,
      },
      config,
    );

    expect(result.triggeredRules.some((rule) => rule.ruleId === "INT_IMPROVISATION_FR")).toBe(true);
    expect(result.triggeredRules.some((rule) => rule.ruleId === "INT_IMPROV_THEATRE")).toBe(true);
    expect(result.triggeredRules.some((rule) => rule.ruleId === "POP_MEDICAL_STUDENT")).toBe(true);
  });

  it("pénalise l'improvisation organisationnelle non théâtrale", () => {
    resetScoringConfigCache();
    const config = loadScoringConfig("v0.2.0");

    const result = scoreReference(
      {
        title: "Organizational improvisation in healthcare management",
        abstract: "",
        keywords: [],
        meshTerms: [],
        hasAbstract: false,
      },
      config,
    );

    expect(result.triggeredRules.some((rule) => rule.ruleId === "NOISE_NON_THEATRICAL")).toBe(true);
    expect(result.subscores.noise).toBeLessThan(0);
  });

  it("utilise le type de publication pour détecter une revue", () => {
    resetScoringConfigCache();
    const config = loadScoringConfig("v0.2.0");

    const result = scoreReference(
      {
        title: "Dramatherapy in psychiatry",
        abstract: "Overview of dramatherapy approaches.",
        keywords: [],
        meshTerms: [],
        publicationType: "Review; Systematic Review",
        hasAbstract: true,
      },
      config,
    );

    expect(result.triggeredRules.some((rule) => rule.ruleId === "DOC_REVIEW")).toBe(true);
    expect(result.alerts).toContain("DOC_REVIEW");
  });
});

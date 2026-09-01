export type ScoringField = "title" | "abstract" | "keywords" | "mesh";

export type SubscoreKey = "intervention" | "population" | "pedagogical" | "noise";

export type ScoringRule = {
  id: string;
  subscore: SubscoreKey;
  weight: number;
  terms: string[];
  fields: ScoringField[];
  alertOnMatch?: string;
  requiresAbsence?: string[];
};

export type ScoringCombination = {
  id: string;
  requireAll: string[];
  bonus: number;
  subscore: SubscoreKey;
};

export type ScoringTag = {
  label: string;
  terms: string[];
  scoreEffect: "none";
};

export type ScoringAlert = {
  id: string;
  condition?: "missingAbstract" | "broadMeshDrama" | "languageNotFrEn";
  ruleId?: string;
};

export type DirectExclusion = {
  id: string;
  exclusionReasonCode: string;
  label: string;
  detail?: string;
};

export type DirectExclusionConfig = {
  id: string;
  condition: "languageNotFrEn";
  exclusionReasonCode: string;
  label: string;
};

export type ScoringConfig = {
  version: string;
  status: string;
  note?: string;
  fieldMultipliers: Record<ScoringField, number>;
  subscoreCaps: Record<SubscoreKey, number>;
  normalization: {
    rawMin: number;
    rawMax: number;
    outputMin: number;
    outputMax: number;
  };
  alerts: ScoringAlert[];
  directExclusions?: DirectExclusionConfig[];
  tags: Record<string, ScoringTag>;
  rules: ScoringRule[];
  combinations: ScoringCombination[];
};

export type ReferenceForScoring = {
  title: string;
  abstract?: string | null;
  keywords: string[];
  meshTerms: string[];
  language?: string | null;
  hasAbstract: boolean;
};

export type MatchSpan = {
  start: number;
  end: number;
  matchedText: string;
};

export type TriggeredRule = {
  ruleId: string;
  subscore: SubscoreKey;
  field: ScoringField;
  weight: number;
  fieldMultiplier: number;
  contribution: number;
  matchedTerm: string;
  matchedText: string;
  span?: MatchSpan;
  negated?: boolean;
};

export type TriggeredTag = {
  tagCode: string;
  label: string;
  field: ScoringField;
  matchedTerm: string;
  matchedText: string;
  span?: MatchSpan;
};

export type ScoringResultPayload = {
  scoreTotal: number;
  rawScore: number;
  subscores: Record<SubscoreKey, number>;
  triggeredRules: TriggeredRule[];
  triggeredTags: TriggeredTag[];
  combinationBonuses: Array<{ id: string; subscore: SubscoreKey; bonus: number }>;
  alerts: string[];
  directExclusion?: DirectExclusion | null;
  ruleConfigVersion: string;
};

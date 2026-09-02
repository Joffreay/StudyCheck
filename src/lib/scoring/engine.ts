import { DEFAULT_SCORING_CONFIG_VERSION, loadScoringConfig } from "./config";
import { shouldAutoExcludeForLanguage } from "./language";
import {
  findTermMatch,
  getFieldTexts,
  hasBroadMeshDrama,
  termMatchesAnyField,
} from "./matcher";
import { applySubscoreCap, normalizeRawScore, sumSubscores } from "./normalize-score";
import type {
  DirectExclusion,
  ReferenceForScoring,
  ScoringConfig,
  ScoringResultPayload,
  SubscoreKey,
  TriggeredRule,
  TriggeredTag,
} from "./types";

function emptySubscores(): Record<SubscoreKey, number> {
  return {
    intervention: 0,
    population: 0,
    pedagogical: 0,
    noise: 0,
  };
}

function ruleTriggeredInAnyField(
  triggeredRules: TriggeredRule[],
  ruleId: string,
): boolean {
  return triggeredRules.some((rule) => rule.ruleId === ruleId && !rule.negated);
}

function sortTermsByLength(terms: string[]): string[] {
  return [...terms].sort((a, b) => b.length - a.length);
}

function resolveDirectExclusion(
  reference: ReferenceForScoring,
  config: ScoringConfig,
): DirectExclusion | null {
  for (const rule of config.directExclusions ?? []) {
    if (rule.condition === "languageNotFrEn" && shouldAutoExcludeForLanguage(reference.language)) {
      return {
        id: rule.id,
        exclusionReasonCode: rule.exclusionReasonCode,
        label: rule.label,
        detail: reference.language ?? undefined,
      };
    }
  }

  return null;
}

export function scoreReference(
  reference: ReferenceForScoring,
  config: ScoringConfig = loadScoringConfig(DEFAULT_SCORING_CONFIG_VERSION),
): ScoringResultPayload {
  const fields = getFieldTexts(reference);
  const triggeredRules: TriggeredRule[] = [];
  const triggeredTags: TriggeredTag[] = [];
  const alerts = new Set<string>();
  const appliedRuleFields = new Set<string>();

  if (!reference.hasAbstract) {
    alerts.add("NO_ABSTRACT");
  }

  if (hasBroadMeshDrama(reference.meshTerms)) {
    alerts.add("BROAD_MESH_DRAMA");
  }

  const directExclusion = resolveDirectExclusion(reference, config);
  if (directExclusion) {
    alerts.add(directExclusion.id);
  }

  for (const [tagCode, tag] of Object.entries(config.tags)) {
    for (const term of sortTermsByLength(tag.terms)) {
      const matches = termMatchesAnyField(
        fields,
        ["title", "abstract", "keywords", "mesh", "publicationType"],
        term,
      );
      for (const match of matches) {
        triggeredTags.push({
          tagCode,
          label: tag.label,
          field: match.field,
          matchedTerm: term,
          matchedText: match.matchedText,
          span: match.span,
        });
      }
    }
  }

  for (const rule of config.rules) {
    if (rule.requiresAbsence?.some((requiredId) => ruleTriggeredInAnyField(triggeredRules, requiredId))) {
      continue;
    }

    for (const field of rule.fields) {
      const dedupeKey = `${rule.id}:${field}`;
      if (appliedRuleFields.has(dedupeKey)) continue;

      for (const term of sortTermsByLength(rule.terms)) {
        const match = findTermMatch(fields[field], term);
        if (!match) continue;

        const fieldMultiplier = config.fieldMultipliers[field];
        const contribution = match.negated ? 0 : rule.weight * fieldMultiplier;

        triggeredRules.push({
          ruleId: rule.id,
          subscore: rule.subscore,
          field,
          weight: rule.weight,
          fieldMultiplier,
          contribution,
          matchedTerm: term,
          matchedText: match.matchedText,
          span: match.span,
          negated: match.negated,
        });

        appliedRuleFields.add(dedupeKey);

        if (rule.alertOnMatch) {
          alerts.add(rule.alertOnMatch);
        }

        break;
      }
    }
  }

  const subscores = emptySubscores();

  for (const triggered of triggeredRules) {
    subscores[triggered.subscore] += triggered.contribution;
  }

  const combinationBonuses: ScoringResultPayload["combinationBonuses"] = [];

  for (const combo of config.combinations) {
    const allPresent = combo.requireAll.every((ruleId) => ruleTriggeredInAnyField(triggeredRules, ruleId));
    if (!allPresent) continue;

    subscores[combo.subscore] += combo.bonus;
    combinationBonuses.push({
      id: combo.id,
      subscore: combo.subscore,
      bonus: combo.bonus,
    });
  }

  for (const key of Object.keys(subscores) as SubscoreKey[]) {
    subscores[key] = applySubscoreCap(subscores[key], config.subscoreCaps[key]);
  }

  const rawScore = sumSubscores(subscores);
  const scoreTotal = normalizeRawScore(
    rawScore,
    config.normalization.rawMin,
    config.normalization.rawMax,
    config.normalization.outputMin,
    config.normalization.outputMax,
  );

  return {
    scoreTotal,
    rawScore,
    subscores,
    triggeredRules,
    triggeredTags,
    combinationBonuses,
    alerts: Array.from(alerts),
    directExclusion,
    ruleConfigVersion: config.version,
  };
}

export function scoreReferences(
  references: ReferenceForScoring[],
  config?: ScoringConfig,
): ScoringResultPayload[] {
  const activeConfig = config ?? loadScoringConfig(DEFAULT_SCORING_CONFIG_VERSION);
  return references.map((reference) => scoreReference(reference, activeConfig));
}

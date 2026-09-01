import type { SubscoreKey } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function applySubscoreCap(value: number, cap: number): number {
  if (cap >= 0) return Math.min(value, cap);
  return Math.max(value, cap);
}

export function normalizeRawScore(
  rawScore: number,
  rawMin: number,
  rawMax: number,
  outputMin: number,
  outputMax: number,
): number {
  if (rawMax <= rawMin) return outputMin;
  const clamped = clamp(rawScore, rawMin, rawMax);
  const ratio = (clamped - rawMin) / (rawMax - rawMin);
  return Math.round(outputMin + ratio * (outputMax - outputMin));
}

export function sumSubscores(subscores: Record<SubscoreKey, number>): number {
  return subscores.intervention + subscores.population + subscores.pedagogical + subscores.noise;
}

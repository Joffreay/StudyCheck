const ALLOWED_LANGUAGE_TOKENS = new Set([
  "en",
  "eng",
  "english",
  "fr",
  "fre",
  "fra",
  "french",
  "francais",
]);

function normalizeLanguageToken(language: string): string {
  return language
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Langue absente ou non renseignée : pas d'exclusion automatique. */
export function isAllowedScreeningLanguage(language?: string | null): boolean {
  if (!language?.trim()) return true;

  const normalized = normalizeLanguageToken(language);
  const primary = normalized.split(/[-_]/)[0];

  return ALLOWED_LANGUAGE_TOKENS.has(normalized) || ALLOWED_LANGUAGE_TOKENS.has(primary);
}

export function shouldAutoExcludeForLanguage(language?: string | null): boolean {
  if (!language?.trim()) return false;
  return !isAllowedScreeningLanguage(language);
}

import { TagBadge } from "@/components/references/badges";

type TriggeredRule = {
  ruleId: string;
  subscore: string;
  field: string;
  contribution: number;
  matchedTerm: string;
  matchedText: string;
  negated?: boolean;
};

type TriggeredTag = {
  tagCode: string;
  label: string;
  field: string;
  matchedTerm: string;
};

type DirectExclusion = {
  id: string;
  label: string;
  detail?: string;
};

const ALERT_LABELS: Record<string, string> = {
  NO_ABSTRACT: "Sans résumé",
  BROAD_MESH_DRAMA: "MeSH Drama large",
  AMBIGUOUS_POPULATION: "Population ambiguë",
  NON_FR_EN_LANGUAGE: "Langue hors français/anglais",
};

export function ScoreBreakdown({
  scoreTotal,
  subscores,
  triggeredRules,
  triggeredTags,
  alerts,
  combinationBonuses,
  directExclusion,
}: {
  scoreTotal: number;
  subscores: Record<string, number> | null;
  triggeredRules: TriggeredRule[];
  triggeredTags: TriggeredTag[];
  alerts: string[];
  combinationBonuses: Array<{ id: string; bonus: number; subscore: string }>;
  directExclusion?: DirectExclusion | null;
}) {
  const subs = subscores ?? {};

  const subscoreCards = [
    { label: "Priorité", value: scoreTotal, accent: "bg-teal-50 text-teal-800" },
    { label: "Intervention", value: subs.intervention ?? 0, accent: "bg-white text-slate-800" },
    { label: "Population", value: subs.population ?? 0, accent: "bg-white text-slate-800" },
    { label: "Pédagogique", value: subs.pedagogical ?? 0, accent: "bg-white text-slate-800" },
    { label: "Bruit", value: subs.noise ?? 0, accent: "bg-white text-slate-800" },
  ];

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-900">Score et explication</h2>
        <p className="mt-1 text-sm text-slate-600">Moteur lexical transparent — priorisation uniquement.</p>
      </div>

      <div className="card-body">
        <div className="mb-5 grid gap-3 sm:grid-cols-5">
          {subscoreCards.map((item) => (
            <div key={item.label} className={`rounded-2xl px-4 py-3 ${item.accent} ring-1 ring-inset ring-slate-200/80`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        {directExclusion ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <p className="font-semibold">Exclusion automatique</p>
            <p className="mt-1">
              {directExclusion.label}
              {directExclusion.detail ? ` — langue détectée : ${directExclusion.detail}` : ""}
            </p>
          </div>
        ) : null}

        {alerts.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {alerts.map((alert) => (
              <TagBadge key={alert} tone="amber">
                {ALERT_LABELS[alert] ?? alert}
              </TagBadge>
            ))}
          </div>
        ) : null}

        {triggeredTags.length ? (
          <div className="mb-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Tags</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              {triggeredTags.map((tag, index) => (
                <li key={`${tag.tagCode}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                  <span className="font-medium">{tag.label}</span> — « {tag.matchedTerm} » ({tag.field})
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {combinationBonuses.length ? (
          <div className="mb-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Bonus de combinaison</h3>
            <ul className="space-y-1 text-sm text-slate-700">
              {combinationBonuses.map((bonus) => (
                <li key={bonus.id}>
                  {bonus.id} : +{bonus.bonus} ({bonus.subscore})
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <h3 className="mb-2 text-sm font-semibold text-slate-900">Règles déclenchées</h3>
        {triggeredRules.length ? (
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {triggeredRules.map((rule, index) => (
              <li key={`${rule.ruleId}-${rule.field}-${index}`} className="rounded-xl border border-slate-100 bg-white px-3 py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-slate-900">{rule.ruleId}</span>
                  <span className={rule.contribution < 0 ? "font-medium text-rose-700" : "font-medium text-slate-700"}>
                    {rule.contribution > 0 ? "+" : ""}
                    {rule.contribution}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">
                  « {rule.matchedText} » ({rule.field}) · {rule.subscore}
                  {rule.negated ? " · négation détectée" : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Aucune règle déclenchée.</p>
        )}

        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Critères A, B et C : non évalués à ce stade (texte intégral requis).
        </p>
      </div>
    </section>
  );
}

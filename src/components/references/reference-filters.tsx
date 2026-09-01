"use client";

import { useRouter, useSearchParams } from "next/navigation";

type FilterOptions = {
  sourceDatabases: string[];
  languages: string[];
  tags: Array<{ code: string; label: string }>;
  alerts: Array<{ code: string; label: string }>;
};

const STATUS_OPTIONS = [
  { value: "", label: "Tous statuts" },
  { value: "PENDING", label: "À examiner" },
  { value: "RETAIN", label: "Conservée pour la suite" },
  { value: "EXCLUDE", label: "Exclue au pré-tri" },
  { value: "UNCERTAIN", label: "Incertaine" },
];

export function ReferenceFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    params.delete("page");
    router.push(`/references?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Filtres</h2>
          <p className="text-xs text-slate-500">Affinez la file de lecture sans modifier les décisions.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <input
          name="q"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="Rechercher titre / résumé"
          className="input md:col-span-2"
        />

        <select name="status" defaultValue={searchParams.get("status") ?? ""} className="select">
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select name="sort" defaultValue={searchParams.get("sort") ?? "score_desc"} className="select">
          <option value="score_desc">Score ↓</option>
          <option value="score_asc">Score ↑</option>
          <option value="title_asc">Titre A→Z</option>
          <option value="year_desc">Année ↓</option>
        </select>

        <input
          name="scoreMin"
          type="number"
          min={0}
          max={100}
          defaultValue={searchParams.get("scoreMin") ?? ""}
          placeholder="Score min"
          className="input"
        />
        <input
          name="scoreMax"
          type="number"
          min={0}
          max={100}
          defaultValue={searchParams.get("scoreMax") ?? ""}
          placeholder="Score max"
          className="input"
        />

        <select name="sourceDatabase" defaultValue={searchParams.get("sourceDatabase") ?? ""} className="select">
          <option value="">Toutes bases</option>
          {options.sourceDatabases.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>

        <select name="tag" defaultValue={searchParams.get("tag") ?? ""} className="select">
          <option value="">Tous tags</option>
          {options.tags.map((tag) => (
            <option key={tag.code} value={tag.code}>
              {tag.label}
            </option>
          ))}
        </select>

        <select name="alert" defaultValue={searchParams.get("alert") ?? ""} className="select">
          <option value="">Toutes alertes</option>
          {options.alerts.map((alert) => (
            <option key={alert.code} value={alert.code}>
              {alert.label}
            </option>
          ))}
        </select>

        <select name="hasAbstract" defaultValue={searchParams.get("hasAbstract") ?? ""} className="select">
          <option value="">Résumé : tous</option>
          <option value="true">Avec résumé</option>
          <option value="false">Sans résumé</option>
        </select>

        <div className="flex gap-2 md:col-span-2">
          <button type="submit" className="btn-primary">
            Appliquer
          </button>
          <button type="button" onClick={() => router.push("/references")} className="btn-secondary">
            Réinitialiser
          </button>
        </div>
      </div>
    </form>
  );
}

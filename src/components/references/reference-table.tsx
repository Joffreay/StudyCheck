import Link from "next/link";
import type { ScreeningStatus } from "@prisma/client";
import { DecisionBadge, ScoreBadge, TagBadge } from "./badges";

export type ReferenceListItem = {
  id: string;
  title: string;
  year: number | null;
  language: string | null;
  hasAbstract: boolean;
  infoCompleteness: number;
  sources: string[];
  score: number | null;
  alerts: string[];
  tags: Array<{ tagCode: string; label: string }>;
  decision: { status: ScreeningStatus } | null;
};

export function ReferenceTable({
  items,
  page,
  totalPages,
  total,
}: {
  items: ReferenceListItem[];
  page: number;
  totalPages: number;
  total: number;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="card-header flex flex-wrap items-center justify-between gap-2 bg-slate-50/80">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {total} référence{total > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-slate-500">
            Page {page}/{totalPages || 1}
          </p>
        </div>
        <p className="text-xs text-slate-500">Cliquez sur un titre pour ouvrir le détail</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-100 bg-white text-left text-[11px] uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">Titre</th>
              <th className="px-5 py-3">Année</th>
              <th className="px-5 py-3">Bases</th>
              <th className="px-5 py-3">Signaux</th>
              <th className="px-5 py-3">Décision</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id}
                className={`border-t border-slate-100 transition hover:bg-teal-50/40 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                }`}
              >
                <td className="px-5 py-4 align-top">
                  <ScoreBadge score={item.score} />
                </td>
                <td className="px-5 py-4 align-top">
                  <Link
                    href={`/references/${item.id}`}
                    className="font-medium text-slate-900 transition hover:text-teal-700"
                  >
                    {item.title}
                  </Link>
                  {!item.hasAbstract ? (
                    <p className="mt-1 text-xs text-amber-700">
                      Sans résumé · complétude {item.infoCompleteness}%
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-4 align-top text-slate-600">{item.year ?? "—"}</td>
                <td className="px-5 py-4 align-top text-slate-600">{item.sources.join(", ") || "—"}</td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <TagBadge key={tag.tagCode} tone="violet">
                        {tag.label}
                      </TagBadge>
                    ))}
                    {item.alerts.map((alert) => (
                      <TagBadge key={alert} tone="amber">
                        {alert}
                      </TagBadge>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <DecisionBadge status={item.decision?.status ?? "PENDING"} />
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  Aucune référence ne correspond aux filtres.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function pageHref(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(target));
    return `/references?${params.toString()}`;
  }

  return (
    <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
      <Link
        href={pageHref(Math.max(1, page - 1))}
        className={`btn-secondary px-3 py-2 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
      >
        ← Précédent
      </Link>
      <span className="font-medium text-slate-700">
        Page {page} / {totalPages}
      </span>
      <Link
        href={pageHref(Math.min(totalPages, page + 1))}
        className={`btn-secondary px-3 py-2 ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
      >
        Suivant →
      </Link>
    </div>
  );
}

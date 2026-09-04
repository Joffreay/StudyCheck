"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DuplicateGroupSummary } from "@/lib/duplicates/service";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function DuplicatesPanel({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = PAGE_SIZE_OPTIONS.includes(Number(searchParams.get("pageSize")) as (typeof PAGE_SIZE_OPTIONS)[number])
    ? Number(searchParams.get("pageSize"))
    : 25;

  const [groups, setGroups] = useState<DuplicateGroupSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + groups.length, total);

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      router.push(`/duplicates?${params.toString()}`);
    },
    [router, searchParams],
  );

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/duplicates?projectId=${projectId}&status=OPEN&limit=${pageSize}&offset=${offset}`,
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Chargement impossible.");
      }

      const data = (await response.json()) as {
        groups: DuplicateGroupSummary[];
        total: number;
      };
      setGroups(data.groups);
      setTotal(data.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [projectId, pageSize, offset]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      updateQuery({ page: String(totalPages) });
    }
  }, [page, totalPages, updateQuery]);

  async function handleDetect() {
    setDetecting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = (await response.json()) as {
        clustersFound?: number;
        groupsCreated?: number;
        openGroups?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Détection impossible.");
      }

      setMessage(
        `${data.clustersFound ?? 0} titre(s) en double détecté(s) · ${data.groupsCreated ?? 0} nouveau(x) groupe(s) · ${data.openGroups ?? 0} groupe(s) ouvert(s) au total.`,
      );
      updateQuery({ page: "1" });
      await loadGroups();
      router.refresh();
    } catch (detectError) {
      setError(detectError instanceof Error ? detectError.message : "Détection impossible.");
    } finally {
      setDetecting(false);
    }
  }

  async function handleAction(
    groupId: string,
    action: "merge_auto" | "merge" | "dismiss",
    primaryReferenceId?: string,
  ) {
    setActingOn(groupId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/duplicates/${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, primaryReferenceId }),
      });

      const data = (await response.json()) as { error?: string; mergedCount?: number };
      if (!response.ok) {
        throw new Error(data.error ?? "Action impossible.");
      }

      if (action === "merge_auto") {
        setMessage(`Doublon fusionné (${data.mergedCount ?? 0} référence(s) absorbée(s)).`);
      } else if (action === "merge") {
        setMessage(`Référence conservée, ${data.mergedCount ?? 0} doublon(s) fusionné(s).`);
      } else {
        setMessage("Groupe marqué comme non doublon.");
      }

      if (groups.length === 1 && safePage > 1) {
        updateQuery({ page: String(safePage - 1) });
      } else {
        await loadGroups();
      }
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action impossible.");
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Détection par titre</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Regroupe les références dont le titre normalisé est identique (hors fusion DOI/PMID
              automatique). Chaque groupe reste soumis à validation humaine avant fusion.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDetect}
            disabled={detecting}
            className="btn-primary shrink-0"
          >
            {detecting ? "Analyse en cours…" : "Analyser les titres"}
          </button>
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="card-header flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Groupes ouverts</h3>
            <p className="mt-1 text-sm text-slate-600">
              {total} groupe(s) en attente · affichage {rangeStart}–{rangeEnd}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Par page
            <select
              value={pageSize}
              onChange={(event) =>
                updateQuery({ pageSize: event.target.value, page: "1" })
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="card-body text-sm text-slate-500">Chargement…</div>
        ) : groups.length === 0 ? (
          <div className="card-body text-sm text-slate-500">
            Aucun doublon probable détecté pour le moment. Lancez une analyse ou importez de
            nouvelles références.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {groups.map((group) => (
              <li key={group.id} className="px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{group.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {group.referenceCount} occurrence(s) · titre normalisé : {group.titleNormalized}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={actingOn === group.id}
                      onClick={() => handleAction(group.id, "merge_auto")}
                      className="btn-primary px-3 py-2 text-xs"
                    >
                      Fusionner
                    </button>
                    <button
                      type="button"
                      disabled={actingOn === group.id}
                      onClick={() => handleAction(group.id, "dismiss")}
                      className="btn-secondary px-3 py-2 text-xs"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>

                <ul className="mt-4 space-y-3">
                  {group.references.map((reference) => (
                    <li
                      key={reference.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/references/${reference.id}`}
                            className="font-medium text-teal-800 hover:text-teal-900"
                          >
                            {reference.title}
                          </Link>
                          <p className="mt-1 text-xs text-slate-600">
                            {[reference.year, reference.doi, reference.pmid]
                              .filter(Boolean)
                              .join(" · ") || "Identifiants absents"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Sources : {reference.sourceDatabases.join(", ") || "—"} · complétude{" "}
                            {reference.infoCompleteness}%
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={actingOn === group.id}
                          onClick={() => handleAction(group.id, "merge", reference.id)}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          Garder celle-ci
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              disabled={safePage <= 1 || loading}
              onClick={() => updateQuery({ page: String(Math.max(1, safePage - 1)) })}
              className="btn-secondary px-3 py-2 text-sm disabled:opacity-40"
            >
              ← Précédent
            </button>
            <span className="text-sm font-medium text-slate-700">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages || loading}
              onClick={() => updateQuery({ page: String(Math.min(totalPages, safePage + 1)) })}
              className="btn-secondary px-3 py-2 text-sm disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

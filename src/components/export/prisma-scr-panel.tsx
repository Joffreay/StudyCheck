"use client";

import { useEffect, useState } from "react";
import { PrismaScrSankeyChart } from "@/components/export/prisma-scr-sankey-chart";
import type { PrismaScrFlow } from "@/lib/export/prisma-scr-types";

function FlowBox({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "accent" | "muted";
}) {
  const toneClass =
    tone === "accent"
      ? "border-teal-200 bg-teal-50"
      : tone === "muted"
        ? "border-slate-200 bg-slate-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-slate-600">{hint}</p> : null}
    </div>
  );
}

async function downloadExport(projectId: string, format: "json" | "csv" | "markdown") {
  const response = await fetch(`/api/export/prisma-scr?projectId=${projectId}&format=${format}`);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Export PRISMA-ScR impossible.");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filenameMatch = disposition.match(/filename=\"(.+)\"/);
  const extension = format === "json" ? "json" : format === "csv" ? "csv" : "md";
  const filename = filenameMatch?.[1] ?? `studycheck-prisma-scr.${extension}`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PrismaScrPanel({ projectId }: { projectId: string }) {
  const [flow, setFlow] = useState<PrismaScrFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFlow() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/export/prisma-scr?projectId=${projectId}&audit=false`);
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Chargement impossible.");
        }

        const data = (await response.json()) as PrismaScrFlow;
        if (!cancelled) setFlow(data);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Chargement impossible.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFlow();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleExport(format: "json" | "csv" | "markdown") {
    setExporting(format);
    setError(null);

    try {
      await downloadExport(projectId, format);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export impossible.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="card-header flex flex-wrap items-start justify-between gap-4 bg-slate-50/80">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Flux PRISMA-ScR</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Comptages recalculés depuis les imports, fusions et décisions de pré-tri. Phase actuelle :
            screening titre / résumé.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!exporting || loading}
            onClick={() => handleExport("csv")}
            className="btn-secondary px-3 py-2 text-xs"
          >
            {exporting === "csv" ? "Export…" : "CSV"}
          </button>
          <button
            type="button"
            disabled={!!exporting || loading}
            onClick={() => handleExport("json")}
            className="btn-secondary px-3 py-2 text-xs"
          >
            {exporting === "json" ? "Export…" : "JSON"}
          </button>
          <button
            type="button"
            disabled={!!exporting || loading}
            onClick={() => handleExport("markdown")}
            className="btn-secondary px-3 py-2 text-xs"
          >
            {exporting === "markdown" ? "Export…" : "Markdown"}
          </button>
        </div>
      </div>

      <div className="card-body space-y-6">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : flow ? (
          <>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Vue d&apos;ensemble · Sankey
              </p>
              <PrismaScrSankeyChart flow={flow} />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Largeur des flux proportionnelle au nombre de références à chaque transition. Le
                screening repose sur le consensus des deux lecteurs.
              </p>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                1 · Identification
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FlowBox
                  label="Total identifié"
                  value={flow.identification.totalRecordsIdentified}
                  hint="Somme des enregistrements bruts importés par base"
                  tone="accent"
                />
                {flow.identification.bySource.slice(0, 3).map((source) => (
                  <FlowBox
                    key={source.sourceDatabase}
                    label={source.sourceDatabase}
                    value={source.recordsIdentified}
                    hint={`${source.importBatchCount} import(s)`}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                2 · Déduplication
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FlowBox
                  label="Doublons retirés"
                  value={flow.deduplication.duplicatesRemoved}
                  hint="Fusion DOI / PMID / clé canonique"
                />
                <FlowBox
                  label="Records uniques"
                  value={flow.deduplication.recordsAfterDeduplication}
                  hint="Références canoniques en base"
                  tone="accent"
                />
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                3 · Screening titre / résumé
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                {flow.screening.byReader.map((reader) => (
                  <div key={reader.readerId} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">{reader.readerName}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <p className="text-slate-600">
                        Examinées : <span className="font-medium text-slate-900">{reader.screened}</span>
                      </p>
                      <p className="text-slate-600">
                        En attente : <span className="font-medium text-slate-900">{reader.pending}</span>
                      </p>
                      <p className="text-slate-600">
                        Conservées : <span className="font-medium text-emerald-700">{reader.retain}</span>
                      </p>
                      <p className="text-slate-600">
                        Exclues : <span className="font-medium text-rose-700">{reader.exclude}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FlowBox
                  label="Accord RETAIN"
                  value={flow.screening.consensus.bothRetain}
                  hint="Les deux lecteurs conservent"
                />
                <FlowBox
                  label="Accord EXCLUDE"
                  value={flow.screening.consensus.bothExclude}
                  hint="Les deux lecteurs excluent"
                />
                <FlowBox
                  label="Désaccord"
                  value={flow.screening.consensus.disagreement}
                  hint="Décisions divergentes"
                />
                <FlowBox
                  label="Vers texte intégral"
                  value={flow.screening.consensus.proceedingToFullText}
                  hint="Proxy d'éligibilité (double RETAIN)"
                  tone="accent"
                />
              </div>
            </div>

            {flow.exclusionReasons.length ? (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Motifs d&apos;exclusion au screening
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  {flow.exclusionReasons.slice(0, 8).map((reason) => (
                    <li
                      key={`${reason.readerId}-${reason.reasonCode}`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
                    >
                      <span>
                        {reason.reasonLabel}{" "}
                        <span className="text-slate-500">({reason.readerName})</span>
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900">{reason.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-xs leading-5 text-slate-500">{flow.eligibility.note}</p>
          </>
        ) : null}

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>
    </section>
  );
}

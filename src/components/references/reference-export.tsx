"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function ReferenceExport({
  projectId,
  total,
}: {
  projectId: string;
  total: number;
}) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("projectId", projectId);
      params.delete("page");

      const response = await fetch(`/api/references/export?${params.toString()}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Export impossible.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename=\"(.+)\"/);
      const filename = filenameMatch?.[1] ?? "studycheck-export.csv";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Export</p>
          <p className="mt-1 text-xs text-slate-500">
            Télécharge en CSV les {total} référence{total > 1 ? "s" : ""} correspondant aux filtres
            actifs (toutes pages confondues).
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading || total === 0}
          className="btn-secondary"
        >
          {loading ? "Export en cours…" : "Exporter CSV"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

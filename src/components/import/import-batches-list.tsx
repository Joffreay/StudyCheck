"use client";

import { useState } from "react";

export type ImportBatchListItem = {
  id: string;
  filename: string;
  sourceDatabase: string;
  format: string;
  recordsImported: number;
  recordsSkipped: number;
  recordsTotal: number;
  importedAt: string | null;
  status: string;
};

const PREVIEW_COUNT = 5;

function formatImportedAt(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ImportBatchesList({
  batches,
  previewCount = PREVIEW_COUNT,
}: {
  batches: ImportBatchListItem[];
  previewCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasHidden = batches.length > previewCount;
  const visible = expanded ? batches : batches.slice(0, previewCount);

  if (batches.length === 0) {
    return <div className="card-body text-sm text-slate-500">Aucun import pour le moment.</div>;
  }

  return (
    <>
      <ul className={`divide-y divide-slate-100 ${expanded && batches.length > 8 ? "max-h-[32rem] overflow-y-auto" : ""}`}>
        {visible.map((batch) => {
          const importedAt = formatImportedAt(batch.importedAt);

          return (
            <li key={batch.id} className="px-6 py-4 text-sm">
              <p className="font-medium text-slate-900">{batch.filename}</p>
              <p className="mt-1 text-slate-600">
                {batch.sourceDatabase} · {batch.format}
                {batch.status !== "COMPLETED" ? ` · ${batch.status}` : ""}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {batch.recordsImported} importées · {batch.recordsSkipped} ignorées
                {importedAt ? ` · ${importedAt}` : ""}
              </p>
            </li>
          );
        })}
      </ul>

      {hasHidden ? (
        <div className="border-t border-slate-100 px-6 py-3">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            {expanded
              ? "Réduire la liste"
              : `Voir tous les imports (${batches.length})`}
          </button>
        </div>
      ) : null}
    </>
  );
}

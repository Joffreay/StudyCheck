"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RescorePanel({
  projectId,
  referenceCount,
  ruleConfigVersion,
  compact = false,
}: {
  projectId: string;
  referenceCount: number;
  ruleConfigVersion: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRescore() {
    if (!projectId || referenceCount === 0) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/scoring/rescore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const data = (await response.json()) as {
        processed?: number;
        ruleConfigVersion?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Recalcul impossible.");
      }

      const version = data.ruleConfigVersion ?? ruleConfigVersion;
      setMessage(
        `${data.processed ?? 0} référence(s) recalculée(s) avec la config v${version}.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recalcul impossible.");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !projectId || referenceCount === 0;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleRescore} disabled={disabled} className="btn-secondary">
          {loading ? "Recalcul en cours…" : "Mettre à jour les scores"}
        </button>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>
    );
  }

  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900">Mettre à jour les scores</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Recalcule la priorisation de toutes les références déjà importées avec la configuration
        lexicale actuelle (v{ruleConfigVersion}), sans relancer d&apos;import.
      </p>

      <dl className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs uppercase tracking-[0.12em] text-slate-500">Références</dt>
          <dd className="mt-1 font-semibold text-slate-900">{referenceCount}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs uppercase tracking-[0.12em] text-slate-500">Config active</dt>
          <dd className="mt-1 font-semibold text-slate-900">v{ruleConfigVersion}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs text-slate-500">
        Les exclusions automatiques (langue hors FR/EN) ne s&apos;appliquent que si la décision
        du lecteur est encore « À examiner ».
      </p>

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

      <button
        type="button"
        onClick={handleRescore}
        disabled={disabled}
        className="btn-secondary mt-5"
      >
        {loading ? "Recalcul en cours…" : "Recalculer tous les scores"}
      </button>

      {referenceCount === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Importez des références avant de recalculer.</p>
      ) : null}
    </section>
  );
}

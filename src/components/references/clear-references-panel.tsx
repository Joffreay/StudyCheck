"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CONFIRMATION_TEXT = "VIDER";

export function ClearReferencesPanel({
  projectId,
  referenceCount,
}: {
  projectId: string;
  referenceCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClear() {
    if (confirm !== CONFIRMATION_TEXT) {
      setError(`Saisissez ${CONFIRMATION_TEXT} pour confirmer.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/references/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, confirm: CONFIRMATION_TEXT }),
      });

      const data = (await response.json()) as {
        deletedReferences?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Suppression impossible.");
      }

      setOpen(false);
      setConfirm("");
      router.push(`/import?cleared=1&count=${data.deletedReferences ?? 0}`);
      router.refresh();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Suppression impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card border-rose-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Vider la base</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Supprime toutes les références, imports, décisions et scores du projet ({referenceCount}{" "}
        référence{referenceCount > 1 ? "s" : ""}). Action irréversible.
      </p>

      {!open ? (
        <button
          type="button"
          disabled={referenceCount === 0}
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
          className="btn-danger mt-5"
        >
          Vider toutes les références
        </button>
      ) : (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
          <p className="text-sm font-medium text-rose-900">Confirmer la suppression</p>
          <p className="mt-1 text-sm text-rose-800">
            Saisissez <span className="font-semibold">{CONFIRMATION_TEXT}</span> pour effacer
            l&apos;ensemble de la base bibliographique.
          </p>

          <label className="mt-4 block">
            <span className="label">Confirmation</span>
            <input
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="input"
              placeholder={CONFIRMATION_TEXT}
              autoFocus
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || confirm !== CONFIRMATION_TEXT}
              onClick={handleClear}
              className="btn-danger"
            >
              {loading ? "Suppression…" : "Confirmer la suppression"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setOpen(false);
                setConfirm("");
                setError(null);
              }}
              className="btn-secondary"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {referenceCount === 0 ? (
        <p className="mt-3 text-xs text-slate-500">La base est déjà vide.</p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}

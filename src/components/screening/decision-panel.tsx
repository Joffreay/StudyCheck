"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ScreeningStatus } from "@prisma/client";
import { DecisionBadge } from "@/components/references/badges";

type ExclusionReason = {
  id: string;
  code: string;
  label: string;
};

type DecisionPanelProps = {
  referenceId: string;
  currentStatus: ScreeningStatus;
  exclusionReasons: ExclusionReason[];
  currentExclusionReasonId?: string | null;
  currentNote?: string | null;
  nextReferenceId?: string | null;
};

export function DecisionPanel({
  referenceId,
  currentStatus,
  exclusionReasons,
  currentExclusionReasonId,
  currentNote,
  nextReferenceId,
}: DecisionPanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ScreeningStatus>(currentStatus);
  const [exclusionReasonId, setExclusionReasonId] = useState(currentExclusionReasonId ?? "");
  const [note, setNote] = useState(currentNote ?? "");
  const [excludeMode, setExcludeMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentReasonLabel = exclusionReasons.find((reason) => reason.id === currentExclusionReasonId)?.label;

  async function submitDecision(nextStatus: ScreeningStatus, reasonId?: string) {
    setLoading(true);
    setError(null);

    const resolvedReasonId =
      nextStatus === "EXCLUDE" ? (reasonId ?? exclusionReasonId) || null : null;

    if (nextStatus === "EXCLUDE" && !resolvedReasonId) {
      setError("Sélectionnez un motif d'exclusion pour confirmer.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/references/${referenceId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          exclusionReasonId: resolvedReasonId,
          note: note || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Erreur lors de l'enregistrement.");
      }

      setStatus(nextStatus);
      setExcludeMode(false);

      if (nextStatus === "EXCLUDE" && resolvedReasonId) {
        setExclusionReasonId(resolvedReasonId);
      }

      if (nextReferenceId && nextStatus !== "PENDING") {
        router.push(`/references/${nextReferenceId}`);
      } else {
        router.refresh();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  function startExcludeFlow() {
    setError(null);
    setExcludeMode(true);
    setExclusionReasonId(currentExclusionReasonId ?? "");
  }

  function cancelExcludeFlow() {
    setExcludeMode(false);
    setError(null);
    setExclusionReasonId(currentExclusionReasonId ?? "");
  }

  return (
    <section className="card">
      <div className="card-header flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Décision de pré-tri</h2>
          <p className="mt-1 text-sm text-slate-600">
            « Conservée pour la suite » n&apos;est pas une inclusion définitive.
          </p>
        </div>
        <DecisionBadge status={status} />
      </div>

      <div className="card-body">
        {!excludeMode ? (
          <>
            <div className="mb-5 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => submitDecision("RETAIN")}
                className="btn-success"
              >
                Conservée
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => submitDecision("UNCERTAIN")}
                className="btn-warning"
              >
                Incertaine
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={startExcludeFlow}
                className="btn-danger"
              >
                Exclue
              </button>
            </div>

            {status === "EXCLUDE" && currentReasonLabel ? (
              <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900">
                Motif enregistré : <span className="font-medium">{currentReasonLabel}</span>
              </p>
            ) : null}
          </>
        ) : (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
            <p className="text-sm font-medium text-rose-900">Confirmer l&apos;exclusion</p>
            <p className="mt-1 text-sm text-rose-800">
              Sélectionnez un motif pour enregistrer la décision.
            </p>

            <label className="mt-4 block">
              <span className="label">Motif d&apos;exclusion</span>
            </label>
            <ul className="mt-2 space-y-2">
              {exclusionReasons.map((reason) => (
                <li key={reason.id}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => submitDecision("EXCLUDE", reason.id)}
                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-left text-sm text-slate-800 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {reason.label}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <button
                type="button"
                disabled={loading}
                onClick={cancelExcludeFlow}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        <label className="mb-2 block">
          <span className="label">Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            className="input"
            placeholder="Commentaire optionnel"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </div>
    </section>
  );
}

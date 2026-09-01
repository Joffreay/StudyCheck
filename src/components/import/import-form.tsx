"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImportForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const sourceDatabase = String(formData.get("sourceDatabase") ?? "").trim();
    const file = formData.get("file");

    if (!sourceDatabase || !(file instanceof File) || file.size === 0) {
      setError("Vérifiez la base d'origine et le fichier sélectionné.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        recordsImported?: number;
        recordsMerged?: number;
        recordsSkipped?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Import impossible.");
      }

      form.reset();
      router.push(
        `/import?success=1&imported=${data.recordsImported ?? 0}&merged=${data.recordsMerged ?? 0}&skipped=${data.recordsSkipped ?? 0}`,
      );
      router.refresh();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Import impossible. Le fichier est peut-être trop volumineux ou le traitement a expiré.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6">
      <input type="hidden" name="projectId" value={projectId} />

      <label className="mb-4 block">
        <span className="label">Base d&apos;origine</span>
        <input
          name="sourceDatabase"
          required
          disabled={loading}
          placeholder="PubMed, Embase, CINAHL..."
          className="input"
        />
      </label>

      <label className="mb-4 block">
        <span className="label">Format</span>
        <select name="format" className="select" disabled={loading} defaultValue="RIS">
          <option value="RIS">RIS</option>
          <option value="NBIB">NBIB</option>
          <option value="CSV">CSV</option>
        </select>
      </label>

      <label className="mb-6 block">
        <span className="label">Fichier</span>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-8 text-center">
          <input
            name="file"
            type="file"
            required
            disabled={loading}
            accept=".ris,.nbib,.csv,.txt"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-teal-800"
          />
          <p className="mt-3 text-xs text-slate-500">
            Formats acceptés : .ris, .nbib, .csv · jusqu&apos;à ~50 Mo
          </p>
        </div>
      </label>

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Import en cours…" : "Lancer l'import"}
      </button>

      {loading ? (
        <p className="mt-3 text-sm text-slate-600">
          Traitement du fichier en cours. Les imports volumineux peuvent prendre plusieurs minutes.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}

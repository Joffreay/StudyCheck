import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { ImportForm } from "@/components/import/import-form";
import { RescorePanel } from "@/components/scoring/rescore-panel";
import { ClearReferencesPanel } from "@/components/references/clear-references-panel";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { loadScoringConfig } from "@/lib/scoring/config";

export const maxDuration = 300;

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    imported?: string;
    merged?: string;
    skipped?: string;
    error?: string;
    cleared?: string;
    count?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const project = await prisma.reviewProject.findFirst({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { references: true } } },
  });
  const scoringConfig = loadScoringConfig("v0.1.0");

  return (
    <AppShell userName={user.name}>
      <PageHeader
        title="Import bibliographique"
        description="Chargez vos exports RIS, NBIB ou CSV en conservant la provenance de chaque base."
      />

      {params.cleared ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          Base vidée · {params.count ?? 0} référence(s) supprimée(s)
        </div>
      ) : null}

      {params.success ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          Import terminé · {params.imported ?? 0} nouvelles · {params.merged ?? 0} fusionnées ·{" "}
          {params.skipped ?? 0} ignorées
        </div>
      ) : null}

      {params.error ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          Import impossible. Vérifiez la base d&apos;origine et le fichier sélectionné.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {project ? <ImportForm projectId={project.id} /> : null}

        <aside className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-900">Bonnes pratiques</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Un import par base source pour conserver la traçabilité PRISMA-ScR.</li>
              <li>Les doublons DOI/PMID sont fusionnés automatiquement.</li>
              <li>Le scoring est recalculé immédiatement après import.</li>
              <li>Les références sans résumé restent examinables.</li>
            </ul>
          </div>

          {project ? (
            <>
              <RescorePanel
                projectId={project.id}
                referenceCount={project._count.references}
                ruleConfigVersion={scoringConfig.version}
              />
              <ClearReferencesPanel
                projectId={project.id}
                referenceCount={project._count.references}
              />
            </>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}

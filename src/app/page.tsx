import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, PageHeader, StatCard } from "@/components/layout/app-shell";
import { PrismaScrPanel } from "@/components/export/prisma-scr-panel";
import { RescorePanel } from "@/components/scoring/rescore-panel";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { loadScoringConfig } from "@/lib/scoring/config";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await prisma.reviewProject.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      importBatches: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { references: true } },
    },
  });
  const scoringConfig = loadScoringConfig();

  return (
    <AppShell userName={user.name}>
      <PageHeader
        title="Tableau de bord"
        description="Vue d’ensemble du pré-tri bibliographique pour la revue de portée."
        action={
          <div className="flex flex-wrap items-center gap-3">
            {project ? (
              <RescorePanel
                projectId={project.id}
                referenceCount={project._count.references}
                ruleConfigVersion={scoringConfig.version}
                compact
              />
            ) : null}
            <Link href="/references" className="btn-primary">
              Ouvrir le screening
            </Link>
          </div>
        }
      />

      <section className="card mb-6 overflow-hidden">
        <div className="card-header bg-gradient-to-r from-teal-700 to-teal-800 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-100">Projet actif</p>
          <h2 className="mt-1 text-xl font-semibold">{project?.title ?? "Aucun projet"}</h2>
          <p className="mt-2 max-w-3xl text-sm text-teal-50/90">
            {project?.description ?? "Initialisez le projet via le seed Prisma."}
          </p>
        </div>
        <div className="card-body grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Références"
            value={project?._count.references ?? 0}
            hint="Enregistrements canoniques importés"
            accent="teal"
          />
          <StatCard
            label="Imports"
            value={project?.importBatches.length ?? 0}
            hint="Fichiers RIS, NBIB ou CSV traités"
            accent="blue"
          />
          <StatCard
            label="Phase"
            value="Screening"
            hint="Décisions humaines et priorisation par score"
            accent="amber"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-slate-900">Workflow recommandé</h3>
          </div>
          <ol className="card-body space-y-4 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                1
              </span>
              <div>
                <p className="font-medium text-slate-900">Importer les exports bibliographiques</p>
                <p className="mt-1 text-slate-600">Conserver la provenance de chaque base source.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                2
              </span>
              <div>
                <p className="font-medium text-slate-900">Prioriser la lecture via le score</p>
                <p className="mt-1 text-slate-600">Le score oriente la lecture, sans exclure automatiquement.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                3
              </span>
              <div>
                <p className="font-medium text-slate-900">Décider : conserver, exclure ou incertain</p>
                <p className="mt-1 text-slate-600">Chaque lecteur conserve son historique de décisions.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Derniers imports</h3>
            <Link href="/import" className="text-sm font-medium text-teal-700 hover:text-teal-800">
              Nouvel import
            </Link>
          </div>
          {project?.importBatches.length ? (
            <ul className="divide-y divide-slate-100">
              {project.importBatches.map((batch) => (
                <li key={batch.id} className="px-6 py-4 text-sm">
                  <p className="font-medium text-slate-900">{batch.filename}</p>
                  <p className="mt-1 text-slate-600">
                    {batch.sourceDatabase} · {batch.format}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {batch.recordsImported} importées · {batch.recordsSkipped} ignorées
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card-body text-sm text-slate-500">Aucun import pour le moment.</div>
          )}
        </section>
      </div>

      {project ? (
        <div className="mt-6">
          <PrismaScrPanel projectId={project.id} />
        </div>
      ) : null}
    </AppShell>
  );
}

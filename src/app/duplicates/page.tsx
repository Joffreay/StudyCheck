import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { DuplicatesPanel } from "@/components/duplicates/duplicates-panel";
import { getCurrentUser } from "@/lib/auth/session";
import { countOpenDuplicateGroups } from "@/lib/duplicates/service";
import { prisma } from "@/lib/db";

export default async function DuplicatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await prisma.reviewProject.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });

  const openGroups = project ? await countOpenDuplicateGroups(project.id) : 0;

  return (
    <AppShell userName={user.name}>
      <PageHeader
        title="Doublons probables"
        description="Doublons détectés par titre normalisé exact — validation humaine requise avant fusion."
      />

      {project ? (
        <>
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <strong>{openGroups}</strong> groupe(s) ouvert(s) pour le projet « {project.title} ».
            Les fusions DOI/PMID restent automatiques à l&apos;import ; cette page traite les
            homonymies de titre entre bases différentes.
          </div>
          <Suspense fallback={<div className="card p-6 text-sm text-slate-500">Chargement…</div>}>
            <DuplicatesPanel projectId={project.id} />
          </Suspense>
        </>
      ) : (
        <div className="card p-6 text-sm text-slate-500">Aucun projet initialisé.</div>
      )}
    </AppShell>
  );
}

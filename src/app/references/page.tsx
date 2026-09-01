import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { ReferenceExport } from "@/components/references/reference-export";
import { ReferenceFilters } from "@/components/references/reference-filters";
import { Pagination, ReferenceTable } from "@/components/references/reference-table";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getProjectFilterOptions, listReferences } from "@/lib/screening/service";
import { ScreeningStatus } from "@prisma/client";

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function ReferencesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const project = await prisma.reviewProject.findFirst({ orderBy: { createdAt: "asc" } });
  if (!project) redirect("/");

  const statusParam = params.status;
  const status = statusParam ? (statusParam as ScreeningStatus) : undefined;

  const [result, options] = await Promise.all([
    listReferences({
      projectId: project.id,
      userId: user.id,
      q: params.q,
      status,
      scoreMin: params.scoreMin ? Number(params.scoreMin) : undefined,
      scoreMax: params.scoreMax ? Number(params.scoreMax) : undefined,
      tag: params.tag,
      alert: params.alert,
      sourceDatabase: params.sourceDatabase,
      language: params.language,
      hasAbstract:
        params.hasAbstract === "true" ? true : params.hasAbstract === "false" ? false : undefined,
      page: params.page ? Number(params.page) : 1,
      pageSize: 50,
      sort: (params.sort as "score_desc" | "score_asc" | "title_asc" | "year_desc") ?? "score_desc",
    }),
    getProjectFilterOptions(project.id),
  ]);

  return (
    <AppShell userName={user.name} wide>
      <PageHeader
        title="Références"
        description="Tri par score de priorité — aucune décision automatique."
      />

      <Suspense fallback={<div className="card mb-4 h-36 animate-pulse bg-slate-100" />}>
        <ReferenceFilters options={options} />
      </Suspense>

      <div className="mt-5">
        <ReferenceTable
          items={result.items}
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
        />
        <Pagination page={result.page} totalPages={result.totalPages} searchParams={params} />
        <Suspense fallback={null}>
          <ReferenceExport projectId={project.id} total={result.total} />
        </Suspense>
      </div>
    </AppShell>
  );
}

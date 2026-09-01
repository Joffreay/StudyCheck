import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DecisionBadge, ScoreBadge, TagBadge } from "@/components/references/badges";
import { DecisionPanel } from "@/components/screening/decision-panel";
import { ScoreBreakdown } from "@/components/screening/score-breakdown";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  DECISION_LABELS,
  getNextPendingReferenceId,
  getProjectFilterOptions,
  getReferenceDetail,
} from "@/lib/screening/service";

export default async function ReferenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const reference = await getReferenceDetail(id, user.id);
  if (!reference) redirect("/references");

  const project = await prisma.reviewProject.findFirst({ orderBy: { createdAt: "asc" } });
  const [options, nextReferenceId] = await Promise.all([
    project ? getProjectFilterOptions(project.id) : Promise.resolve({ exclusionReasons: [] }),
    project ? getNextPendingReferenceId(project.id, user.id, id) : Promise.resolve(null),
  ]);

  const scoring = reference.scoring;
  const subscores = (scoring?.subscores as Record<string, number> | null) ?? null;

  return (
    <AppShell userName={user.name} wide>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/references" className="btn-secondary px-3 py-2 text-xs">
          ← Retour à la liste
        </Link>
        {nextReferenceId ? (
          <Link href={`/references/${nextReferenceId}`} className="text-sm font-medium text-teal-700 hover:text-teal-800">
            Référence suivante à examiner →
          </Link>
        ) : null}
      </div>

      <article className="card mb-6 overflow-hidden">
        <div className="card-header flex flex-wrap items-start justify-between gap-4 bg-slate-50/80">
          <div className="flex flex-wrap items-center gap-3">
            <ScoreBadge score={scoring?.scoreTotal ?? null} large />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Priorité de lecture</p>
              <DecisionBadge status={reference.decision?.status ?? "PENDING"} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {reference.infoGapFlags.map((flag) => (
              <TagBadge key={flag} tone="amber">
                {flag}
              </TagBadge>
            ))}
          </div>
        </div>

        <div className="card-body">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{reference.title}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {[reference.year, reference.language, reference.publicationType].filter(Boolean).join(" · ")}
          </p>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["DOI", reference.doi ?? "—"],
              ["PMID", reference.pmid ?? "—"],
              ["Complétude", `${reference.infoCompleteness}%`],
              ["Bases", reference.sources.map((s) => s.sourceDatabase).join(", ") || "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt>
                <dd className="mt-1 font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Résumé</h2>
            <div className="rounded-2xl bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-800">
              {reference.abstract ??
                "Résumé non disponible — cela indique un manque d'information, pas une faible pertinence."}
            </div>
          </section>

          {(reference.meshTerms.length > 0 || reference.keywords.length > 0) ? (
            <section className="mt-5">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Marqueurs et descripteurs
              </h2>
              <p className="mb-3 text-xs text-slate-500">
                Descripteurs MeSH (PubMed) et mots-clés auteur — équivalent des tags Zotero.
              </p>
              <div className="flex flex-wrap gap-2">
                {reference.meshTerms.map((term) => (
                  <TagBadge key={`mesh-${term}`} tone="teal">
                    {term}
                  </TagBadge>
                ))}
                {reference.keywords.map((term) => (
                  <TagBadge key={`kw-${term}`} tone="violet">
                    {term}
                  </TagBadge>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </article>

      <div className="grid gap-6 lg:grid-cols-2">
        <ScoreBreakdown
          scoreTotal={scoring?.scoreTotal ?? 0}
          subscores={subscores}
          triggeredRules={reference.triggeredRules as never[]}
          triggeredTags={reference.triggeredTagsDetail as never[]}
          alerts={scoring?.alerts ?? []}
          combinationBonuses={reference.combinationBonuses as never[]}
          directExclusion={reference.directExclusion}
        />

        <DecisionPanel
          referenceId={reference.id}
          currentStatus={reference.decision?.status ?? "PENDING"}
          exclusionReasons={options.exclusionReasons}
          currentExclusionReasonId={reference.decision?.exclusionReasonId}
          currentNote={reference.decision?.note}
          nextReferenceId={nextReferenceId}
        />
      </div>

      <section className="card mt-6">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-slate-900">Historique des décisions</h2>
        </div>
        <div className="card-body">
          {reference.decisionEvents.length ? (
            <ul className="space-y-3 text-sm">
              {reference.decisionEvents.map((event) => (
                <li key={event.id} className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium text-slate-900">{event.user.name}</span>
                    <span className="text-slate-500">{new Date(event.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <p className="mt-1 text-slate-700">
                    {event.fromStatus ? DECISION_LABELS[event.fromStatus] : "—"} → {DECISION_LABELS[event.toStatus]}
                    {event.exclusionReason ? ` · ${event.exclusionReason.label}` : ""}
                  </p>
                  {event.note ? <p className="mt-1 text-slate-600">{event.note}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Aucune décision enregistrée.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}

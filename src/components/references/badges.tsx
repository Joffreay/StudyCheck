import type { ScreeningStatus } from "@prisma/client";
import { DECISION_LABELS } from "@/lib/screening/service";

const STATUS_STYLES: Record<ScreeningStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700 ring-slate-200",
  RETAIN: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  EXCLUDE: "bg-rose-50 text-rose-800 ring-rose-200",
  UNCERTAIN: "bg-amber-50 text-amber-800 ring-amber-200",
};

export function DecisionBadge({ status }: { status: ScreeningStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {DECISION_LABELS[status]}
    </span>
  );
}

export function ScoreBadge({ score, large = false }: { score: number | null; large?: boolean }) {
  if (score === null) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  let tone = "bg-slate-100 text-slate-700 ring-slate-200";
  if (score >= 70) tone = "bg-teal-50 text-teal-800 ring-teal-200";
  else if (score >= 40) tone = "bg-sky-50 text-sky-800 ring-sky-200";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold ring-1 ring-inset ${tone} ${
        large ? "h-12 w-12 text-sm" : "min-w-10 px-2.5 py-1 text-xs"
      }`}
    >
      {score}
    </span>
  );
}

export function TagBadge({
  children,
  tone = "violet",
}: {
  children: React.ReactNode;
  tone?: "violet" | "amber" | "teal" | "slate";
}) {
  const styles =
    tone === "violet"
      ? "bg-violet-50 text-violet-800 ring-violet-200"
      : tone === "amber"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : tone === "teal"
          ? "bg-teal-50 text-teal-800 ring-teal-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}>
      {children}
    </span>
  );
}

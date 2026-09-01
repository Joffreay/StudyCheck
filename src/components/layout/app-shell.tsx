import { AppNav } from "@/components/layout/app-nav";

export function AppShell({
  userName,
  children,
  wide = false,
}: {
  userName: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <AppNav userName={userName} />
      <main className={`mx-auto px-6 pb-12 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "teal",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "teal" | "blue" | "amber" | "slate";
}) {
  const accents = {
    teal: "from-teal-500/15 to-teal-500/5 text-teal-800",
    blue: "from-blue-500/15 to-blue-500/5 text-blue-800",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-800",
    slate: "from-slate-500/10 to-slate-500/5 text-slate-800",
  };

  return (
    <div className={`card bg-gradient-to-br ${accents[accent]} p-5`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-600">{hint}</p> : null}
    </div>
  );
}

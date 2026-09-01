"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/references", label: "Références" },
  { href: "/import", label: "Import" },
];

export function AppNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 mb-8 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-sm font-bold text-white shadow-sm">
              SC
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">StudyCheck</p>
              <p className="text-xs text-slate-500">Pré-tri bibliographique</p>
            </div>
          </Link>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-teal-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{userName}</p>
            <p className="text-xs text-slate-500">Lecteur</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn-secondary px-3 py-2 text-xs">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

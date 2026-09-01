import { NextResponse } from "next/server";
import { referencesToCsv } from "@/lib/export/references-csv";
import { getCurrentUser } from "@/lib/auth/session";
import { exportReferences, parseReferenceListFilters } from "@/lib/screening/service";
import { ScreeningStatus } from "@prisma/client";

function parseHasAbstract(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseSort(value: string | null) {
  if (value === "score_asc" || value === "title_asc" || value === "year_desc") return value;
  return "score_desc" as const;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId requis." }, { status: 400 });
  }

  const statusParam = searchParams.get("status");
  const status = statusParam ? (statusParam as ScreeningStatus) : undefined;

  const filters = parseReferenceListFilters({
    projectId,
    userId: user.id,
    q: searchParams.get("q"),
    status,
    scoreMin: searchParams.get("scoreMin") ? Number(searchParams.get("scoreMin")) : undefined,
    scoreMax: searchParams.get("scoreMax") ? Number(searchParams.get("scoreMax")) : undefined,
    tag: searchParams.get("tag"),
    alert: searchParams.get("alert"),
    sourceDatabase: searchParams.get("sourceDatabase"),
    language: searchParams.get("language"),
    hasAbstract: parseHasAbstract(searchParams.get("hasAbstract")),
    sort: parseSort(searchParams.get("sort")),
  });

  const { rows, total } = await exportReferences(filters);
  const csv = referencesToCsv(rows);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="studycheck-export-${date}.csv"`,
      "X-Export-Count": String(total),
    },
  });
}

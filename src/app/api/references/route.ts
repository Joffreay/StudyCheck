import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listReferences } from "@/lib/screening/service";
import { ScreeningStatus } from "@prisma/client";

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

  const result = await listReferences({
    projectId,
    userId: user.id,
    q: searchParams.get("q") ?? undefined,
    status,
    scoreMin: searchParams.get("scoreMin") ? Number(searchParams.get("scoreMin")) : undefined,
    scoreMax: searchParams.get("scoreMax") ? Number(searchParams.get("scoreMax")) : undefined,
    tag: searchParams.get("tag") ?? undefined,
    alert: searchParams.get("alert") ?? undefined,
    sourceDatabase: searchParams.get("sourceDatabase") ?? undefined,
    language: searchParams.get("language") ?? undefined,
    hasAbstract:
      searchParams.get("hasAbstract") === "true"
        ? true
        : searchParams.get("hasAbstract") === "false"
          ? false
          : undefined,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 50,
    sort: (searchParams.get("sort") as "score_desc" | "score_asc" | "title_asc" | "year_desc") ?? "score_desc",
  });

  return NextResponse.json(result);
}

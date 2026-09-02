import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prismaScrToCsv, prismaScrToMarkdownSummary } from "@/lib/export/prisma-scr-format";
import { computePrismaScrFlow, recordPrismaScrExport } from "@/lib/export/prisma-scr";

function parseFormat(value: string | null): "json" | "csv" | "markdown" {
  if (value === "csv" || value === "markdown") return value;
  return "json";
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

  const format = parseFormat(searchParams.get("format"));
  const audit = searchParams.get("audit") !== "false";

  try {
    const flow = audit
      ? await recordPrismaScrExport(projectId, user.id, format)
      : await computePrismaScrFlow(projectId);

    const date = flow.generatedAt.slice(0, 10);

    if (format === "csv") {
      return new NextResponse(prismaScrToCsv(flow), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="studycheck-prisma-scr-${date}.csv"`,
        },
      });
    }

    if (format === "markdown") {
      return new NextResponse(prismaScrToMarkdownSummary(flow), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="studycheck-prisma-scr-${date}.md"`,
        },
      });
    }

    return NextResponse.json(flow);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export PRISMA-ScR impossible.";
    const status = message === "Projet introuvable." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

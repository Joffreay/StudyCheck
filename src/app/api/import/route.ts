import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { importBibliographicFile } from "@/lib/import/service";
import type { ImportFormat } from "@/lib/parsers";

export const maxDuration = 300;
export const runtime = "nodejs";

const importSchema = z.object({
  projectId: z.string().min(1),
  filename: z.string().min(1),
  format: z.enum(["RIS", "NBIB", "CSV"]),
  sourceDatabase: z.string().min(1),
  content: z.string().min(1),
});

const formatSchema = z.enum(["RIS", "NBIB", "CSV"]);

async function parseImportRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const projectId = String(formData.get("projectId") ?? "");
    const sourceDatabase = String(formData.get("sourceDatabase") ?? "").trim();
    const format = String(formData.get("format") ?? "RIS");
    const file = formData.get("file");

    if (!projectId || !sourceDatabase || !(file instanceof File)) {
      return { error: "Requête invalide." as const };
    }

    const parsedFormat = formatSchema.safeParse(format);
    if (!parsedFormat.success) {
      return { error: "Format invalide." as const };
    }

    const content = await file.text();
    return {
      data: {
        projectId,
        filename: file.name,
        format: parsedFormat.data as ImportFormat,
        sourceDatabase,
        content,
      },
    };
  }

  const body = await request.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return { error: "Requête invalide." as const };
  }

  return { data: parsed.data };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const parsedRequest = await parseImportRequest(request);
  if ("error" in parsedRequest) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  try {
    const summary = await importBibliographicFile(parsedRequest.data);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      { error: "Import impossible. Vérifiez le format du fichier." },
      { status: 500 },
    );
  }
}

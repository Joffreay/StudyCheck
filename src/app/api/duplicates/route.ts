import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { detectTitleDuplicates, listDuplicateGroups } from "@/lib/duplicates/service";
import { DuplicateGroupStatus } from "@prisma/client";

const querySchema = z.object({
  projectId: z.string().min(1),
  status: z.nativeEnum(DuplicateGroupStatus).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const DEFAULT_PAGE_SIZE = 25;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    projectId: url.searchParams.get("projectId"),
    status: url.searchParams.get("status") ?? DuplicateGroupStatus.OPEN,
    limit: url.searchParams.get("limit") ?? DEFAULT_PAGE_SIZE,
    offset: url.searchParams.get("offset") ?? 0,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const result = await listDuplicateGroups(
    parsed.data.projectId,
    parsed.data.status,
    parsed.data.limit,
    parsed.data.offset,
  );

  return NextResponse.json(result);
}

const detectSchema = z.object({ projectId: z.string().min(1) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const parsed = detectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const result = await detectTitleDuplicates(parsed.data.projectId);
  return NextResponse.json(result);
}

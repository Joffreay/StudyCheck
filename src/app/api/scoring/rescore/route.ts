import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { rescoreProject, rescoreReferences } from "@/lib/scoring/service";

const bodySchema = z.union([
  z.object({ projectId: z.string().min(1) }),
  z.object({ referenceIds: z.array(z.string().min(1)).min(1) }),
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if ("projectId" in parsed.data) {
    const summary = await rescoreProject(parsed.data.projectId, user.id);
    return NextResponse.json(summary);
  }

  const results = await rescoreReferences(parsed.data.referenceIds);
  return NextResponse.json(results);
}

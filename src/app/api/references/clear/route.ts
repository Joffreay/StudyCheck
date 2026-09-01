import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { clearProjectReferences } from "@/lib/references/clear-project";

const bodySchema = z.object({
  projectId: z.string().min(1),
  confirm: z.literal("VIDER"),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Confirmation invalide. Saisissez VIDER pour confirmer." },
      { status: 400 },
    );
  }

  const summary = await clearProjectReferences(parsed.data.projectId, user.id);
  return NextResponse.json(summary);
}

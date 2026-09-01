import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { recordDecision } from "@/lib/screening/service";

const bodySchema = z.object({
  status: z.enum(["PENDING", "RETAIN", "EXCLUDE", "UNCERTAIN"]),
  exclusionReasonId: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    const decision = await recordDecision({
      referenceId: id,
      userId: user.id,
      status: parsed.data.status,
      exclusionReasonId: parsed.data.exclusionReasonId,
      note: parsed.data.note,
    });

    return NextResponse.json(decision);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  dismissDuplicateGroup,
  mergeDuplicateGroup,
  mergeDuplicateGroupAutomatically,
} from "@/lib/duplicates/service";

const mergeSchema = z.object({
  action: z.enum(["merge", "merge_auto", "dismiss"]),
  primaryReferenceId: z.string().min(1).optional(),
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
  const parsed = mergeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    if (parsed.data.action === "dismiss") {
      const result = await dismissDuplicateGroup(id, user.id);
      return NextResponse.json(result);
    }

    if (parsed.data.action === "merge_auto") {
      const result = await mergeDuplicateGroupAutomatically(id, user.id);
      return NextResponse.json(result);
    }

    if (!parsed.data.primaryReferenceId) {
      return NextResponse.json({ error: "Référence principale requise." }, { status: 400 });
    }

    const result = await mergeDuplicateGroup(id, parsed.data.primaryReferenceId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action impossible." },
      { status: 400 },
    );
  }
}

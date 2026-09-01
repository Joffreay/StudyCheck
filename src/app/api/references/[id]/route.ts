import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getReferenceDetail } from "@/lib/screening/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await context.params;
  const reference = await getReferenceDetail(id, user.id);

  if (!reference) {
    return NextResponse.json({ error: "Référence introuvable." }, { status: 404 });
  }

  return NextResponse.json(reference);
}

import { NextResponse } from "next/server";
import { apiError, withAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/** POST /api/tokens/[id]/revoke — revoke a token (scoped to the caller). */
export const POST = withAuth(async (_req, { user, params }) => {
  const { id } = await params;
  const token = await prisma.apiToken.findFirst({
    where: { id, userId: user.id },
  });
  if (!token) return apiError("not_found", "Token not found", 404);
  if (!token.revokedAt) {
    await prisma.apiToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
});

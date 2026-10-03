import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, withAuth, zodError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const createTokenSchema = z.object({
  name: z.string().trim().min(1, "required").max(100),
});

/** GET /api/tokens — list token metadata (never hashes). */
export const GET = withAuth(async (_req, { user }) => {
  const tokens = await prisma.apiToken.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
  });
  return NextResponse.json(tokens);
});

/**
 * POST /api/tokens — generate a token. Returns the raw token ONCE;
 * only the SHA-256 hash is stored.
 */
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => ({}));
  const parsed = createTokenSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const raw = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const token = await prisma.apiToken.create({
    data: { userId: user.id, name: parsed.data.name, tokenHash },
    select: { id: true, name: true, createdAt: true },
  });
  return NextResponse.json(
    { id: token.id, name: token.name, createdAt: token.createdAt, token: raw },
    { status: 201 },
  );
});

export async function DELETE() {
  return apiError(
    "method_not_allowed",
    "Use POST /api/tokens/[id]/revoke",
    405,
  );
}

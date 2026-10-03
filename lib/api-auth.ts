import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { auth } from "./auth";
import { prisma } from "./prisma";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

/** Standard error envelope: `{ error: { code, message } }`. */
export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** 400 for Zod validation failures, with issue details. */
export function zodError(e: ZodError) {
  return NextResponse.json(
    {
      error: {
        code: "validation_error",
        message: "Invalid request",
        details: e.issues,
      },
    },
    { status: 400 },
  );
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Authenticate a request two ways:
 *  1. `Authorization: Bearer <token>` — personal access token (SHA-256 hash
 *     lookup on ApiToken; rejected when missing or revoked). `lastUsedAt` is
 *     updated fire-and-forget.
 *  2. Better Auth session cookie.
 * Returns null when neither works.
 */
async function authenticate(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const raw = header.slice("Bearer ".length).trim();
    if (!raw) return null;
    const token = await prisma.apiToken.findUnique({
      where: { tokenHash: hashToken(raw) },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!token || token.revokedAt) return null;
    // Fire-and-forget: don't hold up the response on bookkeeping.
    void prisma.apiToken
      .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
    return token.user;
  }

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  };
}

type AuthedHandler = (
  req: Request,
  ctx: { user: AuthUser; params: Promise<Record<string, string>> },
) => Promise<Response>;

/**
 * Wrap a route handler with authentication. On failure responds
 * 401 `{ error: { code: "unauthorized", ... } }`.
 */
export function withAuth(handler: AuthedHandler) {
  return async (
    req: Request,
    ctx: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    let user: AuthUser | null;
    try {
      user = await authenticate(req);
    } catch {
      return apiError("unauthorized", "Authentication failed", 401);
    }
    if (!user) {
      return apiError("unauthorized", "Authentication required", 401);
    }
    return handler(req, { user, params: ctx.params });
  };
}

import { NextResponse } from "next/server";
import { apiError, withAuth, zodError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { epicPatch } from "@/lib/schemas";
import { serializeEpic } from "@/lib/serialize";

const ownerSelect = { select: { id: true, name: true } } as const;

async function findOwnedEpic(id: string, userId: string) {
  return prisma.epic.findFirst({
    where: { id, ownerId: userId },
    include: { owner: ownerSelect },
  });
}

export const GET = withAuth(async (_req, { user, params }) => {
  const { id } = await params;
  const epic = await findOwnedEpic(id, user.id);
  if (!epic) return apiError("not_found", "Epic not found", 404);
  return NextResponse.json(serializeEpic(epic));
});

export const PATCH = withAuth(async (req, { user, params }) => {
  const { id } = await params;
  const existing = await findOwnedEpic(id, user.id);
  if (!existing) return apiError("not_found", "Epic not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = epicPatch.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  if (parsed.data.ownerId && parsed.data.ownerId !== user.id) {
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.ownerId },
    });
    if (!target) return apiError("unknown_owner", "ownerId does not match a user", 400);
  }

  const epic = await prisma.epic.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.ownerId !== undefined ? { ownerId: parsed.data.ownerId } : {}),
    },
    include: { owner: ownerSelect },
  });
  return NextResponse.json(serializeEpic(epic));
});

export const DELETE = withAuth(async (_req, { user, params }) => {
  const { id } = await params;
  const existing = await findOwnedEpic(id, user.id);
  if (!existing) return apiError("not_found", "Epic not found", 404);

  // Subtasks cascade via the Prisma relation (onDelete: Cascade).
  await prisma.epic.delete({ where: { id: existing.id } });
  return new NextResponse(null, { status: 204 });
});

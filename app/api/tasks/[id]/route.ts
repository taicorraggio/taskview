import { NextResponse } from "next/server";
import { apiError, withAuth, zodError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { taskPatch, toUtcMidnight } from "@/lib/schemas";
import { serializeTask } from "@/lib/serialize";

const ownerSelect = { select: { id: true, name: true } } as const;

async function findOwnedTask(id: string, userId: string) {
  return prisma.task.findFirst({
    where: { id, ownerId: userId },
    include: { owner: ownerSelect },
  });
}

export const GET = withAuth(async (_req, { user, params }) => {
  const { id } = await params;
  const task = await findOwnedTask(id, user.id);
  if (!task) return apiError("not_found", "Task not found", 404);
  return NextResponse.json(serializeTask(task));
});

export const PATCH = withAuth(async (req, { user, params }) => {
  const { id } = await params;
  const existing = await findOwnedTask(id, user.id);
  if (!existing) return apiError("not_found", "Task not found", 404);

  const body = await req.json().catch(() => null);
  const parsed = taskPatch.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const p = parsed.data;

  // Moving to another epic: the target must belong to the caller.
  if (p.epicId !== undefined && p.epicId !== existing.epicId) {
    const target = await prisma.epic.findFirst({
      where: { id: p.epicId, ownerId: user.id },
    });
    if (!target) return apiError("not_found", "Epic not found", 404);
  }

  if (p.ownerId !== undefined && p.ownerId !== user.id) {
    const target = await prisma.user.findUnique({ where: { id: p.ownerId } });
    if (!target) return apiError("unknown_owner", "ownerId does not match a user", 400);
  }

  const task = await prisma.task.update({
    where: { id: existing.id },
    data: {
      ...(p.name !== undefined ? { name: p.name } : {}),
      ...(p.description !== undefined ? { description: p.description } : {}),
      ...(p.status !== undefined ? { status: p.status } : {}),
      ...(p.scheduledDate !== undefined
        ? { scheduledDate: p.scheduledDate ? toUtcMidnight(p.scheduledDate) : null }
        : {}),
      ...(p.waitingOn !== undefined ? { waitingOn: p.waitingOn } : {}),
      ...(p.epicId !== undefined ? { epicId: p.epicId } : {}),
      ...(p.ownerId !== undefined ? { ownerId: p.ownerId } : {}),
    },
    include: { owner: ownerSelect },
  });
  return NextResponse.json(serializeTask(task));
});

export const DELETE = withAuth(async (_req, { user, params }) => {
  const { id } = await params;
  const existing = await findOwnedTask(id, user.id);
  if (!existing) return apiError("not_found", "Task not found", 404);

  await prisma.task.delete({ where: { id: existing.id } });
  return new NextResponse(null, { status: 204 });
});

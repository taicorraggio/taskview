import { NextResponse } from "next/server";
import { apiError, withAuth, zodError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { taskCreate, toUtcMidnight } from "@/lib/schemas";
import { serializeTask } from "@/lib/serialize";

const ownerSelect = { select: { id: true, name: true } } as const;

export const GET = withAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const epicId = searchParams.get("epicId");
  const doneParam = searchParams.get("done");

  let statusFilter: { status: "DONE" } | { status: { not: "DONE" } } | undefined;
  if (doneParam !== null) {
    if (doneParam === "true") statusFilter = { status: "DONE" };
    else if (doneParam === "false") statusFilter = { status: { not: "DONE" } };
    else return apiError("invalid_done", "done must be true or false", 400);
  }

  const tasks = await prisma.task.findMany({
    where: {
      ownerId: user.id,
      ...(epicId ? { epicId } : {}),
      ...statusFilter,
    },
    include: { owner: ownerSelect },
    // Mirrors the timeline task comparator: date asc (nulls last), then name.
    orderBy: [{ scheduledDate: { sort: "asc", nulls: "last" } }, { name: "asc" }],
  });
  return NextResponse.json(tasks.map(serializeTask));
});

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = taskCreate.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  // The epic must belong to the caller — otherwise 404 (no existence leak).
  const epic = await prisma.epic.findFirst({
    where: { id: parsed.data.epicId, ownerId: user.id },
  });
  if (!epic) return apiError("not_found", "Epic not found", 404);

  const ownerId = parsed.data.ownerId ?? user.id;
  if (ownerId !== user.id) {
    const target = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!target) return apiError("unknown_owner", "ownerId does not match a user", 400);
  }

  const task = await prisma.task.create({
    data: {
      name: parsed.data.name,
      epicId: epic.id,
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? "TODO",
      scheduledDate: parsed.data.scheduledDate
        ? toUtcMidnight(parsed.data.scheduledDate)
        : null,
      waitingOn: parsed.data.waitingOn ?? null,
      ownerId,
    },
    include: { owner: ownerSelect },
  });
  return NextResponse.json(serializeTask(task), { status: 201 });
});

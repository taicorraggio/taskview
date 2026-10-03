import { NextResponse } from "next/server";
import { apiError, withAuth, zodError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { epicCreate, epicStatusSchema } from "@/lib/schemas";
import { serializeEpic } from "@/lib/serialize";

const ownerSelect = { select: { id: true, name: true } } as const;

export const GET = withAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  if (statusParam !== null) {
    const parsed = epicStatusSchema.safeParse(statusParam);
    if (!parsed.success) {
      return apiError("invalid_status", "status must be a valid EpicStatus", 400);
    }
  }
  const epics = await prisma.epic.findMany({
    where: {
      ownerId: user.id,
      ...(statusParam ? { status: statusParam as never } : {}),
    },
    include: { owner: ownerSelect },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(epics.map(serializeEpic));
});

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json().catch(() => null);
  const parsed = epicCreate.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const ownerId = parsed.data.ownerId ?? user.id;
  if (ownerId !== user.id) {
    const target = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!target) return apiError("unknown_owner", "ownerId does not match a user", 400);
  }

  const epic = await prisma.epic.create({
    data: {
      name: parsed.data.name,
      status: parsed.data.status ?? "NOT_STARTED",
      ownerId,
    },
    include: { owner: ownerSelect },
  });
  return NextResponse.json(serializeEpic(epic), { status: 201 });
});

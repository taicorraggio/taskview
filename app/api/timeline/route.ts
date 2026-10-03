import { NextResponse } from "next/server";
import { apiError, withAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { epicStatusSchema, toDateString } from "@/lib/schemas";
import {
  bucketTasks,
  getWindow,
  sortRows,
  todayUtc,
  type BucketName,
  type TimelineEpic,
  type TimelineTask,
} from "@/lib/timeline";

export const GET = withAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const bucketParam = searchParams.get("bucket") ?? undefined;
  const statusParam = searchParams.get("status") ?? undefined;

  if (bucketParam !== undefined && bucketParam !== "week" && bucketParam !== "day") {
    return apiError("invalid_bucket", 'bucket must be "week" or "day"', 400);
  }
  if (statusParam !== undefined) {
    const parsed = epicStatusSchema.safeParse(statusParam);
    if (!parsed.success) {
      return apiError("invalid_status", "status must be a valid EpicStatus", 400);
    }
  }

  let window;
  try {
    window = getWindow(from, to, (bucketParam as BucketName | undefined) ?? "week");
  } catch (e) {
    return apiError("invalid_window", e instanceof Error ? e.message : "Invalid window", 400);
  }

  const today = todayUtc();

  const epics = await prisma.epic.findMany({
    where: {
      ownerId: user.id,
      // DONE epics are excluded by default; ?status= overrides (incl. DONE).
      ...(statusParam ? { status: statusParam as never } : { status: { not: "DONE" } }),
    },
    include: {
      owner: { select: { id: true, name: true } },
      tasks: { include: { owner: { select: { id: true, name: true } } } },
    },
  });

  const rows = epics.map((epic) => {
    const epicOut: TimelineEpic = {
      id: epic.id,
      name: epic.name,
      status: epic.status,
      owner: { id: epic.owner.id, name: epic.owner.name },
    };
    const tasks: TimelineTask[] = epic.tasks.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      status: t.status,
      scheduledDate: toDateString(t.scheduledDate),
      waitingOn: t.waitingOn,
      owner: { id: t.owner.id, name: t.owner.name },
    }));
    return { epic: epicOut, ...bucketTasks(tasks, window, today) };
  });

  return NextResponse.json({
    window: { start: window.start, end: window.end, bucket: window.bucket },
    buckets: window.buckets,
    rows: sortRows(rows),
  });
});

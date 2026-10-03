import type { Epic, Task, User } from "./generated/prisma/client";
import { toDateString } from "./schemas";

type OwnerRef = Pick<User, "id" | "name">;
type EpicWithOwner = Epic & { owner: OwnerRef };
type TaskWithOwner = Task & { owner: OwnerRef };

export function serializeEpic(e: EpicWithOwner) {
  return {
    id: e.id,
    name: e.name,
    status: e.status,
    owner: { id: e.owner.id, name: e.owner.name },
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function serializeTask(t: TaskWithOwner) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    status: t.status,
    scheduledDate: toDateString(t.scheduledDate),
    waitingOn: t.waitingOn,
    epicId: t.epicId,
    owner: { id: t.owner.id, name: t.owner.name },
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

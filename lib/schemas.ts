import { z } from "zod";

// Shared Zod schemas (zod v4) for the TaskView API.
// Used by route handlers; the timeline UI will reuse these for forms later.

// ---------------------------------------------------------------------------
// Date helpers — date-only semantics throughout (Prisma `@db.Date`).
// ---------------------------------------------------------------------------

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
  .refine((s) => {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return (
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d
    );
  }, "must be a real calendar date");

/** Convert a validated YYYY-MM-DD string to a Date at UTC midnight (for `@db.Date`). */
export function toUtcMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Serialize a Prisma `@db.Date` value back to YYYY-MM-DD. */
export function toDateString(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Enums (mirror the Prisma enums)
// ---------------------------------------------------------------------------

export const epicStatusSchema = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING",
  "DONE",
]);

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

// ---------------------------------------------------------------------------
// Epics
// ---------------------------------------------------------------------------

const nameField = z.string().trim().min(1, "required").max(200);

export const epicCreate = z.object({
  name: nameField,
  status: epicStatusSchema.optional(),
  ownerId: z.string().optional(),
});

export const epicPatch = z
  .object({
    name: nameField.optional(),
    status: epicStatusSchema.optional(),
    ownerId: z.string().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export const taskCreate = z.object({
  name: nameField,
  epicId: z.string().min(1, "required"),
  description: z.string().trim().max(2000).optional(),
  status: taskStatusSchema.optional(),
  scheduledDate: dateString.optional(),
  waitingOn: z.string().trim().min(1).max(200).optional(),
  ownerId: z.string().optional(),
});

export const taskPatch = z
  .object({
    name: nameField.optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    status: taskStatusSchema.optional(),
    // For waiting tasks this is the follow-up/nudge date. Null clears it.
    scheduledDate: dateString.nullable().optional(),
    // Null clears the waiting flag.
    waitingOn: z.string().trim().min(1).max(200).nullable().optional(),
    // Move the task to another epic (must belong to the user).
    epicId: z.string().min(1).optional(),
    ownerId: z.string().optional(),
  })
  .strict();

export type EpicCreate = z.infer<typeof epicCreate>;
export type EpicPatch = z.infer<typeof epicPatch>;
export type TaskCreate = z.infer<typeof taskCreate>;
export type TaskPatch = z.infer<typeof taskPatch>;

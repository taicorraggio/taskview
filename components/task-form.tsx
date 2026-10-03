"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskStatusSchema } from "@/lib/schemas";
import type { TimelineTask } from "@/lib/timeline";
import type { CurrentUser } from "@/lib/queries";
import {
  useCreateTask,
  usePatchTask,
  useDeleteTask,
} from "@/lib/queries";
import { SegmentedRadio } from "./segmented-radio";

const taskFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  epicId: z.string().min(1, "Pick an epic"),
  description: z.string().max(2000),
  status: taskStatusSchema,
  // type="date" yields YYYY-MM-DD; empty = no date.
  scheduledDate: z
    .string()
    .refine(
      (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "Use a valid date",
    ),
  waitingOn: z.string().trim().max(200),
  ownerId: z.string().min(1, "Pick an owner"),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-lavender-600 focus:outline-none focus:ring-2 focus:ring-lavender-600/30";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-red-700">
      {message}
    </p>
  );
}

export function TaskForm({
  mode,
  task,
  epics,
  user,
  defaultEpicId,
  onDone,
}: {
  mode: "create" | "edit";
  task?: TimelineTask;
  epics: { id: string; name: string }[];
  user: CurrentUser;
  defaultEpicId?: string;
  onDone: () => void;
}) {
  const createMut = useCreateTask();
  const patchMut = usePatchTask();
  const deleteMut = useDeleteTask();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: task?.name ?? "",
      epicId: defaultEpicId ?? epics[0]?.id ?? "",
      description: task?.description ?? "",
      status: task?.status ?? "TODO",
      scheduledDate: task?.scheduledDate ?? "",
      waitingOn: task?.waitingOn ?? "",
      ownerId: user.id,
    },
  });

  // For waiting tasks the date is the follow-up/nudge date.
  const waitingOnValue = watch("waitingOn");
  const dateLabel = waitingOnValue.trim() ? "Follow-up date" : "Scheduled date";

  async function onSubmit(values: TaskFormValues) {
    setSubmitError(null);
    const clean = (v: string) => {
      const t = v.trim();
      return t === "" ? (mode === "edit" ? null : undefined) : t;
    };
    try {
      if (mode === "create") {
        await createMut.mutateAsync({
          name: values.name.trim(),
          epicId: values.epicId,
          description: clean(values.description) ?? undefined,
          status: values.status,
          scheduledDate: clean(values.scheduledDate) ?? undefined,
          waitingOn: clean(values.waitingOn) ?? undefined,
          ownerId: values.ownerId,
        });
      } else if (task) {
        await patchMut.mutateAsync({
          id: task.id,
          body: {
            name: values.name.trim(),
            epicId: values.epicId || undefined,
            description: clean(values.description),
            status: values.status,
            scheduledDate: clean(values.scheduledDate),
            waitingOn: clean(values.waitingOn),
            ownerId: values.ownerId,
          },
        });
      }
      onDone();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function onDelete() {
    if (!task) return;
    setSubmitError(null);
    try {
      await deleteMut.mutateAsync(task.id);
      onDone();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const busy = isSubmitting || createMut.isPending || patchMut.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate={false}>
      <div>
        <label htmlFor="task-name" className="mb-1 block text-sm font-medium text-neutral-700">
          Name
        </label>
        <input id="task-name" {...register("name")} className={inputClass} autoComplete="off" />
        <FieldError message={errors.name?.message} />
      </div>

      <div>
        <label htmlFor="task-epic" className="mb-1 block text-sm font-medium text-neutral-700">
          Epic
        </label>
        <select id="task-epic" {...register("epicId")} className={inputClass}>
          {epics.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.epicId?.message} />
      </div>

      <div>
        <label htmlFor="task-desc" className="mb-1 block text-sm font-medium text-neutral-700">
          Description
        </label>
        <textarea
          id="task-desc"
          {...register("description")}
          rows={3}
          className={inputClass}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <SegmentedRadio
            name="task-status"
            legend="Status"
            value={field.value}
            onChange={field.onChange}
            options={[
              { value: "TODO", label: "To do" },
              { value: "IN_PROGRESS", label: "In progress" },
              { value: "DONE", label: "Done" },
            ]}
          />
        )}
      />

      <div>
        <label htmlFor="task-date" className="mb-1 block text-sm font-medium text-neutral-700">
          {dateLabel}
        </label>
        <input
          id="task-date"
          type="date"
          {...register("scheduledDate")}
          className={inputClass}
        />
        <FieldError message={errors.scheduledDate?.message} />
      </div>

      <div>
        <label htmlFor="task-waiting" className="mb-1 block text-sm font-medium text-neutral-700">
          Waiting on
        </label>
        <input
          id="task-waiting"
          {...register("waitingOn")}
          placeholder="Who has the ball? (empty = not waiting)"
          className={inputClass}
          autoComplete="off"
        />
        <FieldError message={errors.waitingOn?.message} />
      </div>

      <div>
        <label htmlFor="task-owner" className="mb-1 block text-sm font-medium text-neutral-700">
          Owner
        </label>
        <select id="task-owner" {...register("ownerId")} className={inputClass}>
          <option value={user.id}>{user.name ?? user.email} (you)</option>
        </select>
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <div>
          {mode === "edit" &&
            (confirmingDelete ? (
              <span className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleteMut.isPending}
                  className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-700 disabled:opacity-50"
                >
                  {deleteMut.isPending ? "Deleting…" : "Confirm delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-lavender-600"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded-md px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"
              >
                Delete
              </button>
            ))}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-lavender-600 px-4 py-2 text-sm font-medium text-white hover:bg-lavender-700 focus-visible:outline-2 focus-visible:outline-lavender-600 disabled:opacity-50"
        >
          {busy ? "Saving…" : mode === "create" ? "Create task" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

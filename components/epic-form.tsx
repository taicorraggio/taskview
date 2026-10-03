"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { epicStatusSchema } from "@/lib/schemas";
import type { TimelineEpic } from "@/lib/timeline";
import type { CurrentUser } from "@/lib/queries";
import {
  useCreateEpic,
  usePatchEpic,
  useDeleteEpic,
} from "@/lib/queries";
import { SegmentedRadio } from "./segmented-radio";

const epicFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  status: epicStatusSchema,
  ownerId: z.string().min(1, "Pick an owner"),
});

type EpicFormValues = z.infer<typeof epicFormSchema>;

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-lavender-600 focus:outline-none focus:ring-2 focus:ring-lavender-600/30";

export function EpicForm({
  mode,
  epic,
  taskCount,
  user,
  onDone,
}: {
  mode: "create" | "edit";
  epic?: TimelineEpic;
  /** Unique task count, for the delete warning. */
  taskCount?: number;
  user: CurrentUser;
  onDone: () => void;
}) {
  const createMut = useCreateEpic();
  const patchMut = usePatchEpic();
  const deleteMut = useDeleteEpic();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EpicFormValues>({
    resolver: zodResolver(epicFormSchema),
    defaultValues: {
      name: epic?.name ?? "",
      status: epic?.status ?? "NOT_STARTED",
      ownerId: user.id,
    },
  });

  async function onSubmit(values: EpicFormValues) {
    setSubmitError(null);
    try {
      if (mode === "create") {
        await createMut.mutateAsync({
          name: values.name.trim(),
          status: values.status,
          ownerId: values.ownerId,
        });
      } else if (epic) {
        await patchMut.mutateAsync({
          id: epic.id,
          body: { name: values.name.trim(), status: values.status, ownerId: values.ownerId },
        });
      }
      onDone();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function onDelete() {
    if (!epic) return;
    setSubmitError(null);
    try {
      await deleteMut.mutateAsync(epic.id);
      onDone();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const busy = isSubmitting || createMut.isPending || patchMut.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="epic-name" className="mb-1 block text-sm font-medium text-neutral-700">
          Name
        </label>
        <input id="epic-name" {...register("name")} className={inputClass} autoComplete="off" />
        {errors.name?.message && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {errors.name.message}
          </p>
        )}
      </div>

      <Controller
        name="status"
        control={control}
        render={({ field }) => (
          <SegmentedRadio
            name="epic-status"
            legend="Status"
            value={field.value}
            onChange={field.onChange}
            options={[
              { value: "NOT_STARTED", label: "Not started" },
              { value: "IN_PROGRESS", label: "In progress" },
              { value: "WAITING", label: "Waiting" },
              { value: "DONE", label: "Done" },
            ]}
          />
        )}
      />

      <div>
        <label htmlFor="epic-owner" className="mb-1 block text-sm font-medium text-neutral-700">
          Owner
        </label>
        <select id="epic-owner" {...register("ownerId")} className={inputClass}>
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
              <span className="inline-flex flex-col items-start gap-2">
                {typeof taskCount === "number" && taskCount > 0 && (
                  <p role="alert" className="text-xs text-red-700">
                    This will permanently delete the epic and its {taskCount}{" "}
                    task{taskCount === 1 ? "" : "s"}.
                  </p>
                )}
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
          {busy ? "Saving…" : mode === "create" ? "Create epic" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useToggleTaskStatus } from "@/lib/queries";
import type { TimelineTask } from "@/lib/timeline";
import { formatDate } from "@/lib/dates";
import { OVERDUE_DOT, TASK_STATUS_DOT } from "@/lib/status-colors";

const STATUS_LABEL: Record<TimelineTask["status"], string> = {
  TODO: "to do",
  IN_PROGRESS: "in progress",
  DONE: "done",
};

/**
 * A task rendered as a chip. Checkbox toggles done (optimistic);
 * clicking the body opens the edit panel.
 */
export function TaskChip({
  task,
  onOpen,
  showDate = false,
  overdue = false,
}: {
  task: TimelineTask;
  onOpen: (task: TimelineTask, trigger: HTMLElement) => void;
  /** Show the scheduled/follow-up date under the name (waiting column). */
  showDate?: boolean;
  /** Derived overdue state — red takes precedence over the status color. */
  overdue?: boolean;
}) {
  const toggle = useToggleTaskStatus();
  const done = task.status === "DONE";
  const dotClass = overdue ? OVERDUE_DOT : TASK_STATUS_DOT[task.status];

  return (
    <div
      className={`group flex items-start gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[13px] leading-snug ${
        done
          ? "border-neutral-200 bg-neutral-50 opacity-70"
          : "border-neutral-200 bg-white hover:border-lavender-500"
      }`}
    >
      <span
        aria-hidden="true"
        title={`${STATUS_LABEL[task.status]}${overdue ? ", overdue" : ""}`}
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass}`}
      />
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`Mark "${task.name}" as ${done ? "not done" : "done"}`}
        disabled={toggle.isPending}
        onClick={(e) => {
          e.stopPropagation();
          toggle.mutate({
            id: task.id,
            status: done ? "TODO" : "DONE",
          });
        }}
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-neutral-400 bg-white text-transparent hover:border-lavender-600 focus-visible:outline-2 focus-visible:outline-lavender-600 aria-checked:border-lavender-700 aria-checked:bg-lavender-600 aria-checked:text-white"
      >
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
          <path
            d="M2 6.5 4.8 9 10 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={(e) => onOpen(task, e.currentTarget)}
        aria-label={`Edit task "${task.name}" (${STATUS_LABEL[task.status]}${overdue ? ", overdue" : ""})`}
        className="min-w-0 flex-1 rounded text-left focus-visible:outline-2 focus-visible:outline-lavender-600"
      >
        <span
          className={`block break-words font-medium text-neutral-800 ${
            done ? "line-through" : ""
          }`}
        >
          {task.name}
        </span>
        {task.waitingOn && !done && (
          <span className="mt-0.5 block text-xs text-amber-800">
            waiting on {task.waitingOn}
            {showDate && task.scheduledDate
              ? ` · nudge ${formatDate(task.scheduledDate)}`
              : ""}
          </span>
        )}
        {!task.waitingOn && showDate && task.scheduledDate && !done && (
          <span className="mt-0.5 block text-xs text-neutral-500">
            {formatDate(task.scheduledDate)}
          </span>
        )}
      </button>
    </div>
  );
}

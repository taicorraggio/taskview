// Canonical status color coding — the single source of truth for every
// status indicator in the app (task chips, epic sidebar dots, grid status
// labels, badges).
//
//   not started → neutral gray
//   in progress → lavender (brand accent)
//   waiting     → amber
//   done        → green
//   overdue     → red (derived: incomplete + scheduledDate before today;
//                 takes precedence over the task's own status color)

import type { TimelineEpic, TimelineTask } from "./timeline";

export const TASK_STATUS_DOT: Record<TimelineTask["status"], string> = {
  TODO: "bg-neutral-400",
  IN_PROGRESS: "bg-lavender-600",
  DONE: "bg-green-600",
};

export const EPIC_STATUS_DOT: Record<TimelineEpic["status"], string> = {
  NOT_STARTED: "bg-neutral-400",
  IN_PROGRESS: "bg-lavender-600",
  WAITING: "bg-amber-500",
  DONE: "bg-green-600",
};

export const OVERDUE_DOT = "bg-red-600";

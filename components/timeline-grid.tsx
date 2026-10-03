"use client";

import { Fragment } from "react";
import type {
  Bucket,
  TimelineEpic,
  TimelineRow,
  TimelineTask,
} from "@/lib/timeline";
import { TaskChip } from "./task-chip";

// Fixed column widths (px). Sticky left columns need explicit offsets.
const W = {
  epic: 200,
  waiting: 150,
  unscheduled: 150,
  overdue: 150,
  bucket: 150,
  future: 230,
};

interface LeftCol {
  key: "waiting" | "unscheduled" | "overdue";
  label: string;
  width: number;
  get: (row: TimelineRow) => TimelineTask[];
  showDate: boolean;
  headerExtra: string;
  cellBg: string;
}

const EPIC_STATUS_LABEL: Record<TimelineEpic["status"], string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  WAITING: "Waiting",
  DONE: "Done",
};

const cellBase = "border-b border-r border-neutral-200 p-2 align-top";
const stickyCell = "sticky bg-white";

export function TimelineGrid({
  buckets,
  rows,
  today,
  highlightedId,
  onOpenTask,
  onNewTask,
  onOpenEpic,
}: {
  buckets: Bucket[];
  rows: TimelineRow[];
  /** YYYY-MM-DD (client local) for the today highlight. */
  today: string;
  highlightedId: string | null;
  onOpenTask: (
    task: TimelineTask,
    epicId: string,
    trigger: HTMLElement,
  ) => void;
  onNewTask: (epicId: string, trigger: HTMLElement) => void;
  onOpenEpic: (epic: TimelineEpic, trigger: HTMLElement) => void;
}) {
  // Non-date columns (waiting / unscheduled / overdue / future) are hidden
  // when empty across all rows.
  const leftCols: LeftCol[] = [];
  if (rows.some((r) => r.waiting.length > 0))
    leftCols.push({
      key: "waiting",
      label: "Waiting on someone",
      width: W.waiting,
      get: (r) => r.waiting,
      showDate: true,
      headerExtra: "",
      cellBg: "bg-white",
    });
  if (rows.some((r) => r.unscheduled.length > 0))
    leftCols.push({
      key: "unscheduled",
      label: "Unscheduled",
      width: W.unscheduled,
      get: (r) => r.unscheduled,
      showDate: false,
      headerExtra: "",
      cellBg: "bg-white",
    });
  if (rows.some((r) => r.overdue.length > 0))
    leftCols.push({
      key: "overdue",
      label: "Overdue",
      width: W.overdue,
      get: (r) => r.overdue,
      showDate: true,
      headerExtra: "bg-red-100 text-red-900",
      cellBg: "bg-red-50",
    });
  const showFuture = rows.some((r) => r.future.length > 0);

  // Cumulative sticky offsets: epic at 0, then each visible left column.
  const leftOffsets: number[] = [];
  {
    let acc = W.epic;
    for (const c of leftCols) {
      leftOffsets.push(acc);
      acc += c.width;
    }
  }

  const gridTemplateColumns = [
    `${W.epic}px`,
    ...leftCols.map((c) => `${c.width}px`),
    ...buckets.map(() => `${W.bucket}px`),
    ...(showFuture ? [`${W.future}px`] : []),
  ].join(" ");

  const leftHeader = (left: number, label: string, extra = "") => (
    <div
      key={label}
      role="columnheader"
      style={{ left, zIndex: 40 }}
      className={`${cellBase} sticky top-0 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 ${extra}`}
    >
      {label}
    </div>
  );

  return (
    <div
      role="region"
      aria-label="Timeline grid"
      tabIndex={0}
      className="flex-1 overflow-auto focus-visible:outline-2 focus-visible:outline-lavender-600"
    >
      <div className="grid min-w-max" style={{ gridTemplateColumns }}>
        {/* Header row */}
        {leftHeader(0, "Epic")}
        {leftCols.map((c, i) => leftHeader(leftOffsets[i], c.label, c.headerExtra))}
        {buckets.map((b) => {
          const isToday = today >= b.start && today <= b.end;
          return (
            <div
              key={b.key}
              role="columnheader"
              style={{ zIndex: 30 }}
              className={`${cellBase} sticky top-0 text-center text-xs font-semibold ${
                isToday
                  ? "bg-lavender-100 text-lavender-700"
                  : "bg-neutral-50 text-neutral-500"
              }`}
            >
              {b.label}
            </div>
          );
        })}
        {showFuture && (
          <div
            role="columnheader"
            style={{ zIndex: 40 }}
            className={`${cellBase} sticky top-0 right-0 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500`}
          >
            Future
          </div>
        )}

        {/* Body rows (flat grid children; rows arrive pre-sorted from the API) */}
        {rows.map((row) => {
          const cellMap = new Map(row.cells.map((c) => [c.bucketKey, c.tasks]));
          const hl = highlightedId === row.epic.id;
          return (
            <Fragment key={row.epic.id}>
              {/* Epic */}
              <div
                id={`row-${row.epic.id}`}
                style={{ left: 0, zIndex: 20 }}
                className={`${cellBase} ${stickyCell} scroll-mt-16 ${
                  hl ? "bg-lavender-100" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => onOpenEpic(row.epic, e.currentTarget)}
                  aria-label={`Edit epic "${row.epic.name}"`}
                  className="block w-full rounded text-left font-semibold text-neutral-900 hover:text-lavender-700 focus-visible:outline-2 focus-visible:outline-lavender-600"
                >
                  {row.epic.name}
                </button>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {EPIC_STATUS_LABEL[row.epic.status]}
                </p>
                <button
                  type="button"
                  onClick={(e) => onNewTask(row.epic.id, e.currentTarget)}
                  aria-label={`Add task to "${row.epic.name}"`}
                  className="mt-1.5 rounded-md px-2 py-1 text-xs font-medium text-lavender-700 hover:bg-lavender-50 focus-visible:outline-2 focus-visible:outline-lavender-600"
                >
                  + Task
                </button>
              </div>

              {/* Waiting / Unscheduled / Overdue — hidden when empty across all rows */}
              {leftCols.map((c, i) => (
                <div
                  key={c.key}
                  style={{ left: leftOffsets[i], zIndex: 20 }}
                  className={`${cellBase} sticky ${c.cellBg}`}
                >
                  <TaskList
                    tasks={c.get(row)}
                    epicId={row.epic.id}
                    onOpenTask={onOpenTask}
                    showDate={c.showDate}
                  />
                </div>
              ))}

              {/* Date buckets */}
              {buckets.map((b) => {
                const tasks = cellMap.get(b.key) ?? [];
                const isToday = today >= b.start && today <= b.end;
                return (
                  <div
                    key={b.key}
                    className={`${cellBase} ${isToday ? "bg-lavender-50/60" : ""}`}
                  >
                    <TaskList
                      tasks={tasks}
                      epicId={row.epic.id}
                      onOpenTask={onOpenTask}
                    />
                  </div>
                );
              })}

              {/* Future — hidden when empty across all rows */}
              {showFuture && (
                <div
                  style={{ zIndex: 20 }}
                  className={`${cellBase} sticky right-0 bg-white`}
                >
                  <TaskList
                    tasks={row.future}
                    epicId={row.epic.id}
                    onOpenTask={onOpenTask}
                    showDate
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function TaskList({
  tasks,
  epicId,
  onOpenTask,
  showDate = false,
}: {
  tasks: TimelineTask[];
  epicId: string;
  onOpenTask: (
    task: TimelineTask,
    epicId: string,
    trigger: HTMLElement,
  ) => void;
  showDate?: boolean;
}) {
  if (tasks.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {tasks.map((t) => (
        <li key={t.id}>
          <TaskChip
            task={t}
            showDate={showDate}
            onOpen={(task, trigger) => onOpenTask(task, epicId, trigger)}
          />
        </li>
      ))}
    </ul>
  );
}

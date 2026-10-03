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
  epic: 230,
  waiting: 210,
  unscheduled: 210,
  overdue: 210,
  bucket: 150,
  future: 230,
};
const LEFT_OFFSETS = [
  0,
  W.epic,
  W.epic + W.waiting,
  W.epic + W.waiting + W.unscheduled,
];

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
  onOpenTask: (task: TimelineTask, epicId: string, trigger: HTMLElement) => void;
  onNewTask: (epicId: string, trigger: HTMLElement) => void;
  onOpenEpic: (epic: TimelineEpic, trigger: HTMLElement) => void;
}) {
  const gridTemplateColumns = [
    `${W.epic}px`,
    `${W.waiting}px`,
    `${W.unscheduled}px`,
    `${W.overdue}px`,
    ...buckets.map(() => `${W.bucket}px`),
    `${W.future}px`,
  ].join(" ");

  const leftHeader = (i: number, label: string, extra = "") => (
    <div
      key={label}
      role="columnheader"
      style={{ left: LEFT_OFFSETS[i], zIndex: 40 }}
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
        {leftHeader(1, "Waiting on someone")}
        {leftHeader(2, "Unscheduled")}
        {leftHeader(
          3,
          "Overdue",
          "bg-red-100 text-red-900",
        )}
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
        <div
          role="columnheader"
          style={{ zIndex: 40 }}
          className={`${cellBase} sticky top-0 right-0 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500`}
        >
          Future
        </div>

        {/* Body rows (flat grid children; rows arrive pre-sorted from the API) */}
        {rows.map((row) => {
          const cellMap = new Map(row.cells.map((c) => [c.bucketKey, c.tasks]));
          const hl = highlightedId === row.epic.id;
          return (
            <Fragment key={row.epic.id}>
              {/* Epic */}
              <div
                id={`row-${row.epic.id}`}
                style={{ left: LEFT_OFFSETS[0], zIndex: 20 }}
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

              {/* Waiting */}
              <div
                style={{ left: LEFT_OFFSETS[1], zIndex: 20 }}
                className={`${cellBase} ${stickyCell}`}
              >
                <TaskList
                  tasks={row.waiting}
                  epicId={row.epic.id}
                  onOpenTask={onOpenTask}
                  showDate
                />
              </div>

              {/* Unscheduled */}
              <div
                style={{ left: LEFT_OFFSETS[2], zIndex: 20 }}
                className={`${cellBase} ${stickyCell}`}
              >
                <TaskList
                  tasks={row.unscheduled}
                  epicId={row.epic.id}
                  onOpenTask={onOpenTask}
                />
              </div>

              {/* Overdue */}
              <div
                style={{ left: LEFT_OFFSETS[3], zIndex: 20 }}
                className={`${cellBase} sticky bg-red-50`}
              >
                <TaskList
                  tasks={row.overdue}
                  epicId={row.epic.id}
                  onOpenTask={onOpenTask}
                  showDate
                />
              </div>

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

              {/* Future */}
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
  onOpenTask: (task: TimelineTask, epicId: string, trigger: HTMLElement) => void;
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

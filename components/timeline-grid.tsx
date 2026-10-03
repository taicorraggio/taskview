"use client";

import { Fragment, useState } from "react";
import type {
  Bucket,
  TimelineEpic,
  TimelineRow,
  TimelineTask,
} from "@/lib/timeline";
import { TaskChip } from "./task-chip";

// Fixed column widths (px). Sticky left columns need explicit offsets.
// Kept slim: the date buckets are the hero, sticky columns are context.
const W = {
  epic: 200,
  waiting: 150,
  unscheduled: 150,
  overdue: 150,
  bucket: 150,
  future: 230,
  collapsed: 40,
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

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Compact date for collapsed bucket headers: "Oct 12". */
function shortDate(s: string): string {
  const [, m, d] = s.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}`;
}

const EPIC_STATUS_LABEL: Record<TimelineEpic["status"], string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  WAITING: "Waiting",
  DONE: "Done",
};

const cellBase = "border-b border-r border-neutral-200 p-2 align-top";
const stickyCell = "sticky bg-white";

function CollapseToggle({
  collapsed,
  onToggle,
  label,
}: {
  collapsed: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={label}
      title={label}
      className="shrink-0 rounded p-0.5 text-sm leading-none text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-lavender-600"
    >
      {collapsed ? "▸" : "▾"}
    </button>
  );
}

/** Presence indicator used in collapsed rows/columns. */
function TaskDot({
  count,
  tone = "neutral",
}: {
  count: number;
  tone?: "neutral" | "red";
}) {
  if (count === 0) return null;
  const noun = count === 1 ? "task" : "tasks";
  return (
    <span
      role="img"
      aria-label={`${count} ${noun}`}
      title={`${count} ${noun}`}
      className={`mx-auto mt-1 block h-2 w-2 rounded-full ${
        tone === "red" ? "bg-red-400" : "bg-neutral-400"
      }`}
    />
  );
}

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
  const [collapsedRows, setCollapsedRows] =
    useState<ReadonlySet<string>>(new Set());
  const [collapsedCols, setCollapsedCols] =
    useState<ReadonlySet<string>>(new Set());

  const toggleIn = (prev: ReadonlySet<string>, key: string) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };
  const toggleRow = (id: string) =>
    setCollapsedRows((prev) => toggleIn(prev, id));
  const toggleCol = (key: string) =>
    setCollapsedCols((prev) => toggleIn(prev, key));

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

  const colWidth = (key: string, full: number) =>
    collapsedCols.has(key) ? W.collapsed : full;

  // Cumulative sticky offsets: epic at 0, then each visible left column.
  const leftOffsets: number[] = [];
  {
    let acc = W.epic;
    for (const c of leftCols) {
      leftOffsets.push(acc);
      acc += colWidth(c.key, c.width);
    }
  }

  const gridTemplateColumns = [
    `${W.epic}px`,
    ...leftCols.map((c) => `${colWidth(c.key, c.width)}px`),
    ...buckets.map((b) => `${colWidth(b.key, W.bucket)}px`),
    ...(showFuture ? [`${colWidth("future", W.future)}px`] : []),
  ].join(" ");

  const leftHeader = (left: number, col: LeftCol) => {
    const collapsed = collapsedCols.has(col.key);
    return (
      <div
        key={col.key}
        role="columnheader"
        style={{ left, zIndex: 40 }}
        className={`${cellBase} sticky top-0 flex items-center gap-1 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 ${collapsed ? "justify-center" : ""} ${col.headerExtra}`}
      >
        <CollapseToggle
          collapsed={collapsed}
          onToggle={() => toggleCol(col.key)}
          label={`${col.label} — ${collapsed ? "expand" : "collapse"}`}
        />
        {!collapsed && <span className="truncate">{col.label}</span>}
      </div>
    );
  };

  return (
    <div
      role="region"
      aria-label="Timeline grid"
      tabIndex={0}
      className="flex-1 overflow-auto focus-visible:outline-2 focus-visible:outline-lavender-600"
    >
      <div className="grid min-w-max" style={{ gridTemplateColumns }}>
        {/* Header row */}
        <div
          role="columnheader"
          style={{ left: 0, zIndex: 40 }}
          className={`${cellBase} sticky top-0 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500`}
        >
          Epic
        </div>
        {leftCols.map((c, i) => leftHeader(leftOffsets[i], c))}
        {buckets.map((b) => {
          const isToday = today >= b.start && today <= b.end;
          const collapsed = collapsedCols.has(b.key);
          return (
            <div
              key={b.key}
              role="columnheader"
              style={{ zIndex: 30 }}
              className={`${cellBase} sticky top-0 text-xs font-semibold ${
                isToday
                  ? "bg-lavender-100 text-lavender-700"
                  : "bg-neutral-50 text-neutral-500"
              } ${collapsed ? "flex flex-col items-center gap-0.5" : ""}`}
            >
              {collapsed ? (
                <>
                  <CollapseToggle
                    collapsed
                    onToggle={() => toggleCol(b.key)}
                    label={`${b.label} — expand`}
                  />
                  <span className="text-[10px] font-medium normal-case tracking-normal">
                    {shortDate(b.start)}
                  </span>
                </>
              ) : (
                <div className="flex items-center justify-center gap-1">
                  <CollapseToggle
                    collapsed={false}
                    onToggle={() => toggleCol(b.key)}
                    label={`${b.label} — collapse`}
                  />
                  <span>{b.label}</span>
                </div>
              )}
            </div>
          );
        })}
        {showFuture && (
          <div
            role="columnheader"
            style={{ zIndex: 40 }}
            className={`${cellBase} sticky top-0 right-0 flex items-center gap-1 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500 ${collapsedCols.has("future") ? "justify-center" : ""}`}
          >
            <CollapseToggle
              collapsed={collapsedCols.has("future")}
              onToggle={() => toggleCol("future")}
              label={`Future — ${collapsedCols.has("future") ? "expand" : "collapse"}`}
            />
            {!collapsedCols.has("future") && <span>Future</span>}
          </div>
        )}

        {/* Body rows (flat grid children; rows arrive pre-sorted from the API) */}
        {rows.map((row) => {
          const cellMap = new Map(row.cells.map((c) => [c.bucketKey, c.tasks]));
          const hl = highlightedId === row.epic.id;
          const rowCollapsed = collapsedRows.has(row.epic.id);
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
                <div className="flex items-center gap-1">
                  <CollapseToggle
                    collapsed={rowCollapsed}
                    onToggle={() => toggleRow(row.epic.id)}
                    label={`${row.epic.name} — ${rowCollapsed ? "expand" : "collapse"} tasks`}
                  />
                  <button
                    type="button"
                    onClick={(e) => onOpenEpic(row.epic, e.currentTarget)}
                    aria-label={`Edit epic "${row.epic.name}"`}
                    className="block min-w-0 flex-1 rounded text-left font-semibold text-neutral-900 hover:text-lavender-700 focus-visible:outline-2 focus-visible:outline-lavender-600"
                  >
                    {row.epic.name}
                  </button>
                </div>
                {!rowCollapsed && (
                  <>
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
                  </>
                )}
              </div>

              {/* Waiting / Unscheduled / Overdue — hidden when empty across all rows */}
              {leftCols.map((c, i) => {
                const tasks = c.get(row);
                const colCollapsed = collapsedCols.has(c.key);
                return (
                  <div
                    key={c.key}
                    style={{ left: leftOffsets[i], zIndex: 20 }}
                    className={`${cellBase} sticky ${c.cellBg}`}
                  >
                    {rowCollapsed || colCollapsed ? (
                      <TaskDot
                        count={tasks.length}
                        tone={c.key === "overdue" ? "red" : "neutral"}
                      />
                    ) : (
                      <TaskList
                        tasks={tasks}
                        epicId={row.epic.id}
                        onOpenTask={onOpenTask}
                        showDate={c.showDate}
                      />
                    )}
                  </div>
                );
              })}

              {/* Date buckets */}
              {buckets.map((b) => {
                const tasks = cellMap.get(b.key) ?? [];
                const isToday = today >= b.start && today <= b.end;
                const colCollapsed = collapsedCols.has(b.key);
                return (
                  <div
                    key={b.key}
                    className={`${cellBase} ${isToday ? "bg-lavender-50/60" : ""}`}
                  >
                    {rowCollapsed || colCollapsed ? (
                      <TaskDot count={tasks.length} />
                    ) : (
                      <TaskList
                        tasks={tasks}
                        epicId={row.epic.id}
                        onOpenTask={onOpenTask}
                      />
                    )}
                  </div>
                );
              })}

              {/* Future — hidden when empty across all rows */}
              {showFuture && (
                <div
                  style={{ zIndex: 20 }}
                  className={`${cellBase} sticky right-0 bg-white`}
                >
                  {rowCollapsed || collapsedCols.has("future") ? (
                    <TaskDot count={row.future.length} />
                  ) : (
                    <TaskList
                      tasks={row.future}
                      epicId={row.epic.id}
                      onOpenTask={onOpenTask}
                      showDate
                    />
                  )}
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

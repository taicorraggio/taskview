"use client";

import { Fragment, useLayoutEffect, useRef, useState } from "react";
import type {
  Bucket,
  TimelineEpic,
  TimelineRow,
  TimelineTask,
} from "@/lib/timeline";
import { TaskChip } from "./task-chip";
import { EPIC_STATUS_DOT } from "@/lib/status-colors";

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
  onOpenTask,
  onNewTask,
  onOpenEpic,
}: {
  buckets: Bucket[];
  rows: TimelineRow[];
  /** YYYY-MM-DD (client local) for the today highlight. */
  today: string;
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

  // Derived overdue state for color coding: incomplete + date before today.
  const isOverdue = (t: TimelineTask) =>
    t.status !== "DONE" && t.scheduledDate != null && t.scheduledDate < today;

  // Track the horizontal scroll viewport so the "future" column can preview
  // the first task after the rightmost *visible* bucket (not just after the
  // fetched window). Measured synchronously on mount; rAF-throttled after.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ scrollLeft: 0, width: 0 });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setViewport((prev) => {
          const scrollLeft = el.scrollLeft;
          const width = el.clientWidth;
          return prev.scrollLeft === scrollLeft && prev.width === width
            ? prev
            : { scrollLeft, width };
        });
      });
    };
    setViewport({ scrollLeft: el.scrollLeft, width: el.clientWidth });
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

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

  // End date of the rightmost visible date bucket — the "visible window".
  // A bucket counts as visible when at least half of it is uncovered
  // (sticky columns don't count). Falls back to the last fetched bucket.
  const stickyLeftW =
    W.epic + leftCols.reduce((s, c) => s + colWidth(c.key, c.width), 0);
  const futureW = showFuture ? colWidth("future", W.future) : 0;
  let cutoff = buckets.length > 0 ? buckets[buckets.length - 1].end : "";
  {
    let x = stickyLeftW;
    const viewStart = viewport.scrollLeft + stickyLeftW;
    const viewEnd = viewport.scrollLeft + viewport.width - futureW;
    for (const b of buckets) {
      const w = colWidth(b.key, W.bucket);
      const uncovered =
        Math.max(0, Math.min(x + w, viewEnd) - Math.max(x, viewStart));
      if (uncovered >= w * 0.5) cutoff = b.end;
      x += w;
    }
  }

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
      ref={scrollRef}
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
          const rowCollapsed = collapsedRows.has(row.epic.id);
          // First task the user can't see: earliest incomplete task dated
          // after the visible window. Waiting tasks are excluded — the
          // waiting column is always visible, so they aren't "unseen".
          const waitingIds = new Set(row.waiting.map((t) => t.id));
          const upcoming: TimelineTask[] = [];
          const consider = (t: TimelineTask) => {
            if (
              t.status === "DONE" ||
              t.scheduledDate == null ||
              t.scheduledDate <= cutoff ||
              waitingIds.has(t.id)
            )
              return;
            upcoming.push(t);
          };
          for (const c of row.cells) for (const t of c.tasks) consider(t);
          for (const t of row.future) {
            if (t.status !== "DONE" && !waitingIds.has(t.id)) upcoming.push(t);
          }
          upcoming.sort((a, b) => {
            if (a.scheduledDate !== b.scheduledDate)
              return a.scheduledDate! < b.scheduledDate! ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          return (
            <Fragment key={row.epic.id}>
              {/* Epic */}
              <div
                style={{ left: 0, zIndex: 20 }}
                className={`${cellBase} ${stickyCell}`}
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
                  <span
                    role="img"
                    aria-label={EPIC_STATUS_LABEL[row.epic.status]}
                    title={EPIC_STATUS_LABEL[row.epic.status]}
                    className={`h-2 w-2 shrink-0 rounded-full ${EPIC_STATUS_DOT[row.epic.status]}`}
                  />
                </div>
                {!rowCollapsed && (
                  <button
                    type="button"
                    onClick={(e) => onNewTask(row.epic.id, e.currentTarget)}
                    aria-label={`Add task to "${row.epic.name}"`}
                    className="mt-1.5 rounded-md px-2 py-1 text-xs font-medium text-lavender-700 hover:bg-lavender-50 focus-visible:outline-2 focus-visible:outline-lavender-600"
                  >
                    + Task
                  </button>
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
                        tone={tasks.some(isOverdue) ? "red" : "neutral"}
                      />
                    ) : (
                      <TaskList
                        tasks={tasks}
                        epicId={row.epic.id}
                        onOpenTask={onOpenTask}
                        showDate={c.showDate}
                        isOverdue={isOverdue}
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
                      <TaskDot
                        count={tasks.length}
                        tone={tasks.some(isOverdue) ? "red" : "neutral"}
                      />
                    ) : (
                      <TaskList
                        tasks={tasks}
                        epicId={row.epic.id}
                        onOpenTask={onOpenTask}
                        isOverdue={isOverdue}
                      />
                    )}
                  </div>
                );
              })}

              {/* Future — hidden when empty across all rows. Shows the first
                  task after the rightmost *visible* bucket; advances as you
                  scroll right, ending at the first task past the fetched
                  range. */}
              {showFuture && (
                <div
                  style={{ zIndex: 20 }}
                  className={`${cellBase} sticky right-0 bg-white`}
                >
                  {rowCollapsed || collapsedCols.has("future") ? (
                    <TaskDot
                      count={upcoming.length}
                      tone={upcoming.some(isOverdue) ? "red" : "neutral"}
                    />
                  ) : (
                    <TaskList
                      tasks={upcoming.slice(0, 1)}
                      epicId={row.epic.id}
                      onOpenTask={onOpenTask}
                      showDate
                      isOverdue={isOverdue}
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
  isOverdue,
}: {
  tasks: TimelineTask[];
  epicId: string;
  onOpenTask: (
    task: TimelineTask,
    epicId: string,
    trigger: HTMLElement,
  ) => void;
  showDate?: boolean;
  isOverdue: (t: TimelineTask) => boolean;
}) {
  if (tasks.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {tasks.map((t) => (
        <li key={t.id}>
          <TaskChip
            task={t}
            showDate={showDate}
            overdue={isOverdue(t)}
            onOpen={(task, trigger) => onOpenTask(task, epicId, trigger)}
          />
        </li>
      ))}
    </ul>
  );
}

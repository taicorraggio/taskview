"use client";

import type { TimelineRow } from "@/lib/timeline";

const STATUS_DOT: Record<TimelineRow["epic"]["status"], string> = {
  NOT_STARTED: "bg-neutral-400",
  IN_PROGRESS: "bg-lavender-600",
  WAITING: "bg-amber-500",
  DONE: "bg-green-600",
};

const STATUS_LABEL: Record<TimelineRow["epic"]["status"], string> = {
  NOT_STARTED: "not started",
  IN_PROGRESS: "in progress",
  WAITING: "waiting",
  DONE: "done",
};

export function EpicSidebar({
  rows,
  highlightedId,
  onSelect,
  onNewEpic,
}: {
  rows: TimelineRow[];
  highlightedId: string | null;
  onSelect: (epicId: string) => void;
  onNewEpic: (trigger: HTMLElement) => void;
}) {
  return (
    <aside
      aria-label="Epics"
      className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white"
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <h2 className="text-sm font-semibold text-neutral-700">Epics</h2>
        <button
          type="button"
          onClick={(e) => onNewEpic(e.currentTarget)}
          className="rounded-md px-2 py-1 text-sm font-medium text-lavender-700 hover:bg-lavender-50 focus-visible:outline-2 focus-visible:outline-lavender-600"
        >
          + Epic
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto px-2 pb-4">
        {rows.map((row) => (
          <li key={row.epic.id}>
            <button
              type="button"
              onClick={() => onSelect(row.epic.id)}
              aria-label={`${row.epic.name} (${STATUS_LABEL[row.epic.status]})${
                row.overdue.length > 0 ? `, ${row.overdue.length} overdue` : ""
              }`}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-lavender-600 ${
                highlightedId === row.epic.id
                  ? "bg-lavender-100 font-medium text-neutral-900"
                  : "text-neutral-700"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[row.epic.status]}`}
              />
              <span className="min-w-0 flex-1 truncate">{row.epic.name}</span>
              {row.overdue.length > 0 && (
                <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-800">
                  {row.overdue.length}
                </span>
              )}
            </button>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-2 py-4 text-sm text-neutral-500">No epics yet.</li>
        )}
      </ul>
    </aside>
  );
}

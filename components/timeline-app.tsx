"use client";

import { useCallback, useRef, useState } from "react";
import type { BucketName, TimelineEpic, TimelineTask } from "@/lib/timeline";
import { useTimeline, type CurrentUser } from "@/lib/queries";
import { addDays, daysBetween } from "@/lib/dates";
import { TopBar } from "./top-bar";
import { EpicSidebar } from "./epic-sidebar";
import { TimelineGrid } from "./timeline-grid";
import { SlideOverPanel } from "./slide-over-panel";
import { TaskForm } from "./task-form";
import { EpicForm } from "./epic-form";

type PanelState =
  | { kind: "task-create"; epicId: string; title: string }
  | { kind: "task-edit"; task: TimelineTask; epicId: string; title: string }
  | { kind: "epic-create"; title: string }
  | {
      kind: "epic-edit";
      epic: TimelineEpic;
      taskCount: number;
      title: string;
    };

/** Client-local today (YYYY-MM-DD) for the highlight column. */
function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function uniqueTaskCount(row: {
  waiting: TimelineTask[];
  unscheduled: TimelineTask[];
  overdue: TimelineTask[];
  cells: { tasks: TimelineTask[] }[];
  future: TimelineTask[];
}): number {
  const ids = new Set<string>();
  for (const t of row.waiting) ids.add(t.id);
  for (const t of row.unscheduled) ids.add(t.id);
  for (const t of row.overdue) ids.add(t.id);
  for (const c of row.cells) for (const t of c.tasks) ids.add(t.id);
  for (const t of row.future) ids.add(t.id);
  return ids.size;
}

export function TimelineApp({ user }: { user: CurrentUser }) {
  const [nav, setNav] = useState<{ from?: string; to?: string }>({});
  const [bucket, setBucket] = useState<BucketName>("week");
  const [showDone, setShowDone] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, error, refetch } = useTimeline(
    nav.from,
    nav.to,
    bucket,
    showDone,
  );

  const openPanel = useCallback((state: PanelState, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setPanel(state);
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  const shiftWindow = useCallback(
    (dir: 1 | -1) => {
      const w = data?.window;
      if (!w) return;
      const span = daysBetween(w.start, w.end) + 1;
      setNav({
        from: addDays(w.start, dir * span),
        to: addDays(w.end, dir * span),
      });
    },
    [data],
  );

  const selectEpic = useCallback((epicId: string) => {
    document
      .getElementById(`row-${epicId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setHighlightedId(epicId);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 2500);
  }, []);

  const epicsForSelect = (data?.rows ?? []).map((r) => ({
    id: r.epic.id,
    name: r.epic.name,
  }));

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      <TopBar
        user={user}
        bucket={bucket}
        onBucketChange={setBucket}
        onPrev={() => shiftWindow(-1)}
        onToday={() => setNav({})}
        onNext={() => shiftWindow(1)}
        showDone={showDone}
        onShowDoneChange={setShowDone}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        navDisabled={!data || isLoading}
      />

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && data && (
          <EpicSidebar
            rows={data.rows}
            highlightedId={highlightedId}
            onSelect={selectEpic}
            onNewEpic={(trigger) =>
              openPanel({ kind: "epic-create", title: "New epic" }, trigger)
            }
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col" aria-label="Timeline">
          {isLoading && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-neutral-500" role="status">
                Loading timeline…
              </p>
            </div>
          )}

          {isError && (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p role="alert" className="text-sm text-red-700">
                  Couldn&apos;t load the timeline:{" "}
                  {error instanceof Error ? error.message : "unknown error"}
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-lavender-600"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {data && data.rows.length === 0 && (
            <div className="flex flex-1 items-center justify-center px-4">
              <div className="max-w-sm text-center">
                <h2 className="text-lg font-semibold text-neutral-900">
                  No epics yet
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Epics are the big threads of your life: immigration, finding a
                  new job, buying a house. Add one, then break it into tasks on
                  the timeline.
                </p>
                <button
                  type="button"
                  onClick={(e) =>
                    openPanel(
                      { kind: "epic-create", title: "New epic" },
                      e.currentTarget,
                    )
                  }
                  className="mt-4 rounded-md bg-lavender-600 px-4 py-2 text-sm font-medium text-white hover:bg-lavender-700 focus-visible:outline-2 focus-visible:outline-lavender-600"
                >
                  Create your first epic
                </button>
              </div>
            </div>
          )}

          {data && data.rows.length > 0 && (
            <TimelineGrid
              buckets={data.buckets}
              rows={data.rows}
              today={localToday()}
              highlightedId={highlightedId}
              onOpenTask={(task, epicId, trigger) =>
                openPanel(
                  { kind: "task-edit", task, epicId, title: "Edit task" },
                  trigger,
                )
              }
              onNewTask={(epicId, trigger) =>
                openPanel(
                  { kind: "task-create", epicId, title: "New task" },
                  trigger,
                )
              }
              onOpenEpic={(epic, trigger) => {
                const row = data.rows.find((r) => r.epic.id === epic.id);
                openPanel(
                  {
                    kind: "epic-edit",
                    epic,
                    taskCount: row ? uniqueTaskCount(row) : 0,
                    title: "Edit epic",
                  },
                  trigger,
                );
              }}
            />
          )}
        </main>
      </div>

      {panel && (
        <SlideOverPanel title={panel.title} onClose={closePanel}>
          {panel.kind === "task-create" && (
            <TaskForm
              mode="create"
              epics={epicsForSelect}
              user={user}
              defaultEpicId={panel.epicId}
              onDone={closePanel}
            />
          )}
          {panel.kind === "task-edit" && (
            <TaskForm
              mode="edit"
              task={panel.task}
              epics={epicsForSelect}
              user={user}
              defaultEpicId={panel.epicId}
              onDone={closePanel}
            />
          )}
          {panel.kind === "epic-create" && (
            <EpicForm mode="create" user={user} onDone={closePanel} />
          )}
          {panel.kind === "epic-edit" && (
            <EpicForm
              mode="edit"
              epic={panel.epic}
              taskCount={panel.taskCount}
              user={user}
              onDone={closePanel}
            />
          )}
        </SlideOverPanel>
      )}
    </div>
  );
}

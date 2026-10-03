// Pure timeline view-model logic — no DB, no Next.js imports, unit-testable.
//
// Date-only semantics throughout: every date is a YYYY-MM-DD string compared
// lexicographically (which is chronological for this format). "Today" is the
// server's UTC calendar date; the overdue boundary therefore flips at UTC
// midnight, not local midnight. Documented, not fixed — a personal app with
// one user in UTC-5, and UTC-midnight flip is at 7/8pm local, which is fine.

export type BucketName = "week" | "day";

export interface Bucket {
  key: string;
  label: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export interface TimelineWindow {
  start: string;
  end: string;
  bucket: BucketName;
  buckets: Bucket[];
}

export interface TimelineTask {
  id: string;
  name: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  scheduledDate: string | null; // YYYY-MM-DD
  waitingOn: string | null;
  owner: { id: string; name: string | null };
}

export interface TimelineEpic {
  id: string;
  name: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "WAITING" | "DONE";
  owner: { id: string; name: string | null };
}

export interface TimelineCell {
  bucketKey: string;
  tasks: TimelineTask[];
}

export interface TimelineRowBuckets {
  waiting: TimelineTask[];
  unscheduled: TimelineTask[];
  overdue: TimelineTask[];
  cells: TimelineCell[];
  future: TimelineTask[];
}

export type SortGroup = "overdue" | "unscheduled" | "scheduled";

export interface TimelineRow extends TimelineRowBuckets {
  epic: TimelineEpic;
  sort: { group: SortGroup; nextEvent: string | null };
}

// ---------------------------------------------------------------------------
// Date helpers (UTC, date-only)
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toDateString(d);
}

/** Monday of the week containing `s` (ISO weeks start Monday). */
function startOfWeekMonday(s: string): string {
  const d = parseDate(s);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const back = (dow + 6) % 7; // days since Monday
  return addDays(s, -back);
}

/** ISO week number for keying week buckets (e.g. 2026-W44). */
function isoWeekKey(s: string): string {
  // Thursday determines the ISO week-year.
  const thursday = addDays(s, 3 - (((parseDate(s).getUTCDay() + 6) % 7)));
  const year = thursday.slice(0, 4);
  const jan4 = `${year}-01-04`;
  const week = Math.round(
    (parseDate(thursday).getTime() - parseDate(startOfWeekMonday(jan4)).getTime()) /
      (7 * 86400_000),
  ) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function labelFor(s: string): string {
  const [, m, d] = s.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

/**
 * Build the timeline window. Defaults: start of last week (Monday) through
 * +12 weeks, weekly buckets. Throws on invalid input (callers map to 400).
 */
export function getWindow(
  from?: string,
  to?: string,
  bucket: BucketName = "week",
): TimelineWindow {
  if (bucket !== "week" && bucket !== "day") {
    throw new Error(`bucket must be "week" or "day"`);
  }
  const start =
    from ?? startOfWeekMonday(addDays(todayUtc(), -7));
  const end = to ?? addDays(start, 12 * 7 - 1);
  if (!isValidDate(start)) throw new Error(`invalid from date: ${from}`);
  if (!isValidDate(end)) throw new Error(`invalid to date: ${to}`);
  if (start > end) throw new Error(`from must not be after to`);

  const buckets: Bucket[] = [];
  if (bucket === "week") {
    let cur = startOfWeekMonday(start);
    while (cur <= end) {
      const bEnd = addDays(cur, 6);
      buckets.push({ key: isoWeekKey(cur), label: labelFor(cur), start: cur, end: bEnd });
      cur = addDays(cur, 7);
    }
  } else {
    let cur = start;
    while (cur <= end) {
      buckets.push({ key: cur, label: labelFor(cur), start: cur, end: cur });
      cur = addDays(cur, 1);
    }
  }
  return { start, end, bucket, buckets };
}

// ---------------------------------------------------------------------------
// Task comparator: scheduledDate asc (undated last), ties alphabetical.
// ---------------------------------------------------------------------------

export function compareTasks(a: TimelineTask, b: TimelineTask): number {
  if (a.scheduledDate && b.scheduledDate) {
    if (a.scheduledDate !== b.scheduledDate) {
      return a.scheduledDate < b.scheduledDate ? -1 : 1;
    }
  } else if (a.scheduledDate) {
    return -1;
  } else if (b.scheduledDate) {
    return 1;
  }
  return a.name.localeCompare(b.name);
}

// ---------------------------------------------------------------------------
// Bucketing — two independent questions per task:
//   1. Waiting?  waitingOn set and not done → `waiting` column (ADDITIVE).
//   2. When?     overdue / cells / future / unscheduled by scheduledDate.
// ---------------------------------------------------------------------------

export function bucketTasks(
  tasks: TimelineTask[],
  window: TimelineWindow,
  today: string = todayUtc(),
): TimelineRowBuckets {
  const waiting: TimelineTask[] = [];
  const unscheduled: TimelineTask[] = [];
  const overdue: TimelineTask[] = [];
  const future: TimelineTask[] = [];
  const inWindow: TimelineTask[] = [];

  for (const t of tasks) {
    const isWaiting = t.waitingOn != null && t.waitingOn !== "" && t.status !== "DONE";
    if (isWaiting) waiting.push(t);

    const done = t.status === "DONE";
    const d = t.scheduledDate;
    // Overdue boundary: before today, or before the window when the window
    // starts in the future (custom windows only — the default window always
    // starts in the past, so this reduces to "before today").
    const overdueBefore = today > window.start ? today : window.start;
    if (!d) {
      if (!done) unscheduled.push(t);
      // Done + dateless: history, dropped everywhere.
    } else if (d < overdueBefore) {
      if (!done) overdue.push(t);
      // Done + dated before the window: dropped (in-window done tasks live in cells).
    } else if (d > window.end) {
      if (!done) future.push(t);
    } else {
      inWindow.push(t); // d within [window.start, window.end]; done included — rendered struck/faded
    }
  }

  waiting.sort(compareTasks);
  unscheduled.sort(compareTasks);
  overdue.sort(compareTasks);
  future.sort(compareTasks);
  inWindow.sort(compareTasks);

  const cells: TimelineCell[] = [];
  for (const b of window.buckets) {
    const inBucket = inWindow.filter(
      (t) => t.scheduledDate! >= b.start && t.scheduledDate! <= b.end,
    );
    if (inBucket.length > 0) {
      cells.push({ bucketKey: b.key, tasks: inBucket });
    }
  }

  return { waiting, unscheduled, overdue, cells, future };
}

// ---------------------------------------------------------------------------
// Row sort — first-match-wins groups:
//   1. has overdue → earliest overdue date first, ties alphabetical
//   2. has unscheduled (no overdue) → alphabetical
//   3. rest → next event date asc (incomplete tasks in cells + future);
//      no upcoming events sink to the bottom, alphabetical.
// ---------------------------------------------------------------------------

const GROUP_ORDER: Record<SortGroup, number> = {
  overdue: 0,
  unscheduled: 1,
  scheduled: 2,
};

function minDate(tasks: TimelineTask[]): string | null {
  let min: string | null = null;
  for (const t of tasks) {
    if (t.scheduledDate && (min === null || t.scheduledDate < min)) min = t.scheduledDate;
  }
  return min;
}

export function sortRows(
  rows: Array<{ epic: TimelineEpic } & TimelineRowBuckets>,
): TimelineRow[] {
  const withMeta = rows.map((r) => {
    let group: SortGroup;
    let key: string | null;
    if (r.overdue.length > 0) {
      group = "overdue";
      key = minDate(r.overdue);
    } else if (r.unscheduled.length > 0) {
      group = "unscheduled";
      key = null;
    } else {
      group = "scheduled";
      // Next event: earliest date among incomplete tasks in cells + future.
      const upcoming: TimelineTask[] = [];
      for (const c of r.cells) {
        for (const t of c.tasks) if (t.status !== "DONE") upcoming.push(t);
      }
      upcoming.push(...r.future);
      key = minDate(upcoming);
    }
    return { ...r, sort: { group, nextEvent: key } };
  });

  withMeta.sort((a, b) => {
    const g = GROUP_ORDER[a.sort.group] - GROUP_ORDER[b.sort.group];
    if (g !== 0) return g;
    const ka = a.sort.nextEvent;
    const kb = b.sort.nextEvent;
    if (ka && kb && ka !== kb) return ka < kb ? -1 : 1;
    if (ka && !kb) return -1;
    if (!ka && kb) return 1;
    return a.epic.name.localeCompare(b.epic.name);
  });

  return withMeta;
}

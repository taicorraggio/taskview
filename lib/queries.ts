"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { api } from "./api-client";
import type {
  Bucket,
  BucketName,
  TimelineRow,
  TimelineTask,
} from "./timeline";
import type {
  EpicCreate,
  EpicPatch,
  TaskCreate,
  TaskPatch,
} from "./schemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimelineResponse {
  window: { start: string; end: string; bucket: BucketName };
  buckets: Bucket[];
  rows: TimelineRow[];
}

export interface TokenMeta {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function useTimeline(
  from: string | undefined,
  to: string | undefined,
  bucket: BucketName,
  showDone = false,
) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("bucket", bucket);
  if (showDone) params.set("status", "all");
  return useQuery<TimelineResponse>({
    queryKey: ["timeline", from ?? null, to ?? null, bucket, showDone],
    queryFn: () => api<TimelineResponse>(`/api/timeline?${params}`),
  });
}

function invalidateTimeline(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ["timeline"] });
}

// ---------------------------------------------------------------------------
// Writes — epics
// ---------------------------------------------------------------------------

export function useCreateEpic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EpicCreate) =>
      api("/api/epics", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidateTimeline(queryClient),
  });
}

export function usePatchEpic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: EpicPatch }) =>
      api(`/api/epics/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => invalidateTimeline(queryClient),
  });
}

export function useDeleteEpic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/epics/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateTimeline(queryClient),
  });
}

// ---------------------------------------------------------------------------
// Writes — tasks
// ---------------------------------------------------------------------------

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TaskCreate) =>
      api("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidateTimeline(queryClient),
  });
}

export function usePatchTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TaskPatch }) =>
      api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => invalidateTimeline(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateTimeline(queryClient),
  });
}

/**
 * Optimistic done-toggle for a task chip. Flips `status` in every cached
 * timeline response immediately; rolls back on error. Note: the server
 * re-buckets on refetch, so a task may move columns after the toggle lands.
 */
export function useToggleTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "TODO" | "DONE" }) =>
      api(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status } satisfies TaskPatch),
      }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["timeline"] });
      const previous = queryClient.getQueriesData<TimelineResponse>({
        queryKey: ["timeline"],
      });
      queryClient.setQueriesData<TimelineResponse>(
        { queryKey: ["timeline"] },
        (old) => {
          if (!old) return old;
          const flip = (t: TimelineTask): TimelineTask =>
            t.id === id ? { ...t, status } : t;
          return {
            ...old,
            rows: old.rows.map((row) => ({
              ...row,
              waiting: row.waiting.map(flip),
              unscheduled: row.unscheduled.map(flip),
              overdue: row.overdue.map(flip),
              future: row.future.map(flip),
              cells: row.cells.map((c) => ({
                ...c,
                tasks: c.tasks.map(flip),
              })),
            })),
          };
        },
      );
      return { previous };
    },
    onError: (_e, _v, context) => {
      context?.previous.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },
    onSettled: () => invalidateTimeline(queryClient),
  });
}

// ---------------------------------------------------------------------------
// API tokens (settings)
// ---------------------------------------------------------------------------

export function useTokens() {
  return useQuery<TokenMeta[]>({
    queryKey: ["tokens"],
    queryFn: () => api<TokenMeta[]>("/api/tokens"),
  });
}

export function useCreateToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) =>
      api<{ id: string; name: string; token: string }>("/api/tokens", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tokens"] }),
  });
}

export function useRevokeToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/tokens/${id}/revoke`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tokens"] }),
  });
}

"use client";

import Link from "next/link";
import type { CurrentUser } from "@/lib/queries";
import { SignOutButton } from "./sign-out-button";
import { SegmentedRadio } from "./segmented-radio";
import type { BucketName } from "@/lib/timeline";

export function TopBar({
  user,
  bucket,
  onBucketChange,
  onPrev,
  onToday,
  onNext,
  showDone,
  onShowDoneChange,
  onNewEpic,
  navDisabled,
}: {
  user: CurrentUser;
  bucket: BucketName;
  onBucketChange: (b: BucketName) => void;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  showDone: boolean;
  onShowDoneChange: (v: boolean) => void;
  onNewEpic: (trigger: HTMLElement) => void;
  navDisabled: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-neutral-200 bg-white px-4 py-2.5">
      <Link
        href="/"
        className="text-lg font-semibold text-neutral-900 focus-visible:outline-2 focus-visible:outline-lavender-600"
      >
        TaskView
      </Link>

      <nav aria-label="Timeline window" className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          disabled={navDisabled}
          aria-label="Previous period"
          className="rounded-md px-2 py-1.5 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-lavender-600 disabled:opacity-40"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onToday}
          disabled={navDisabled}
          className="rounded-md px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-lavender-600 disabled:opacity-40"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={navDisabled}
          aria-label="Next period"
          className="rounded-md px-2 py-1.5 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-lavender-600 disabled:opacity-40"
        >
          ›
        </button>
      </nav>

      <SegmentedRadio
        name="bucket"
        legend="Bucket size"
        value={bucket}
        onChange={onBucketChange}
        options={[
          { value: "week", label: "Week" },
          { value: "day", label: "Day" },
        ]}
      />

      <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-neutral-600">
        <input
          type="checkbox"
          checked={showDone}
          onChange={(e) => onShowDoneChange(e.target.checked)}
          className="h-4 w-4 rounded accent-lavender-600"
        />
        Show done
      </label>

      <button
        type="button"
        onClick={(e) => onNewEpic(e.currentTarget)}
        className="rounded-md px-2 py-1.5 text-sm font-medium text-lavender-700 hover:bg-lavender-50 focus-visible:outline-2 focus-visible:outline-lavender-600"
      >
        + Epic
      </button>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-sm text-neutral-500 sm:inline">
          {user.name ?? user.email}
        </span>
        <Link
          href="/settings"
          className="rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-lavender-600"
        >
          Settings
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}

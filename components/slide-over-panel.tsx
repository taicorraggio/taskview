"use client";

import { useEffect, useRef } from "react";

/**
 * Non-modal right slide-over panel. No focus trap, no overlay — the page
 * behind stays visible and interactive. Focus moves to the panel heading on
 * open and returns to the triggering element on close; ESC closes.
 */
export function SlideOverPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <section
      ref={panelRef}
      aria-label={title}
      className="fixed inset-y-0 right-0 z-50 flex w-[min(430px,100vw)] flex-col border-l border-neutral-200 bg-white shadow-xl transition-transform"
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-neutral-900 focus:outline-none"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-lavender-600"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </section>
  );
}

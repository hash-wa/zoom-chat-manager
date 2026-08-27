"use client";

import { useEffect, useState } from "react";

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "j / ↓", description: "Focus next message" },
  { keys: "k / ↑", description: "Focus previous message" },
  { keys: "s", description: "Star / unstar the focused message" },
  { keys: "x", description: "Check / uncheck the focused message" },
  { keys: "Delete", description: "Delete the focused message" },
  { keys: "/", description: "Open search" },
  { keys: "Esc", description: "Close search / clear focus" },
  { keys: "?", description: "Show this overlay" },
];

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export default function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (isTyping(e.target)) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Keyboard shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-lg leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          On the Chats, chat, or Tagged Messages page, with focus outside any text field. Esc always works, even while typing.
        </p>
        <dl className="space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <dt className="text-slate-600 dark:text-slate-400">{s.description}</dt>
              <dd className="shrink-0 font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded px-1.5 py-0.5">
                {s.keys}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

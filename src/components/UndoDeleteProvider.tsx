"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";

const DELAY_MS = 5000;

type PendingDelete = {
  id: number;
  label: string;
  onExpire: () => void | Promise<void>;
};

type UndoDeleteContextValue = {
  isPending: (id: number) => boolean;
  scheduleDelete: (pending: PendingDelete) => void;
};

const UndoDeleteContext = createContext<UndoDeleteContextValue | null>(null);

export function UndoDeleteProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [barVisible, setBarVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Timers/keyboard handlers close over stale state if they read `pending`
  // directly, so the always-current value lives in a ref instead (the same
  // staleness issue fixed earlier for the message-list keyboard shortcuts).
  const pendingRef = useRef<PendingDelete | null>(null);
  pendingRef.current = pending;

  function commitPending() {
    const current = pendingRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPending(null);
    if (current) current.onExpire();
  }

  function scheduleDelete(next: PendingDelete) {
    // Only one delete is undo-able at a time - if another is still pending,
    // let it commit for real right now rather than silently dropping it.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const prior = pendingRef.current;
      if (prior) prior.onExpire();
    }
    setPending(next);
    setBarVisible(false);
    // Starts the width transition on the next frame so it animates from
    // 100% instead of snapping straight to 0%.
    requestAnimationFrame(() => requestAnimationFrame(() => setBarVisible(true)));
    timerRef.current = setTimeout(commitPending, DELAY_MS);
  }

  function undo() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPending(null);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!pendingRef.current) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function isPending(id: number) {
    return pending?.id === id;
  }

  return (
    <UndoDeleteContext.Provider value={{ isPending, scheduleDelete }}>
      {children}
      {pending && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200]">
          <div className="bg-slate-900 dark:bg-slate-700 text-white rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 text-xs">
              <FontAwesomeIcon icon={faTrashCan} className="text-slate-400" size="sm" />
              <span className="flex-1 whitespace-nowrap">{pending.label}</span>
              <button
                onClick={undo}
                className="font-medium text-indigo-300 hover:text-indigo-200 shrink-0"
              >
                Undo <span className="opacity-60">(Ctrl+Z)</span>
              </button>
            </div>
            <div
              className="h-0.5 bg-indigo-400 transition-[width] ease-linear"
              style={{ width: barVisible ? "0%" : "100%", transitionDuration: `${DELAY_MS}ms` }}
            />
          </div>
        </div>
      )}
    </UndoDeleteContext.Provider>
  );
}

export function useUndoDelete() {
  const ctx = useContext(UndoDeleteContext);
  if (!ctx) throw new Error("useUndoDelete must be used within UndoDeleteProvider");
  return ctx;
}

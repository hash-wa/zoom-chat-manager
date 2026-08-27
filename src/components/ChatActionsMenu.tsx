"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisVertical,
  faFileExport,
  faCircleCheck,
  faCircle,
  faTrashCan,
  faNoteSticky,
} from "@fortawesome/free-solid-svg-icons";

export default function ChatActionsMenu({
  chatId,
  chatTitle,
  initialReviewed,
  reviewedInMenu = false,
  hasNotes = false,
  onEditNote,
}: {
  chatId: number;
  chatTitle: string;
  initialReviewed: boolean;
  // Renders "Mark reviewed" as a menu item instead of a separate icon
  // button - used on the chat detail page, where the toolbar is already
  // busy with other icons.
  reviewedInMenu?: boolean;
  hasNotes?: boolean;
  onEditNote?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reviewed, setReviewed] = useState(initialReviewed);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function toggleReviewed() {
    if (busy) return;
    setBusy(true);
    const next = !reviewed;
    setReviewed(next);
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${chatTitle}"? This cannot be undone.`)) return;
    setDeleting(true);
    setOpen(false);
    try {
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      router.push("/chats");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      {!reviewedInMenu && (
        <button
          onClick={toggleReviewed}
          disabled={busy}
          title={reviewed ? "Reviewed" : "Mark reviewed"}
          aria-label={reviewed ? "Reviewed" : "Mark reviewed"}
          className={`text-base disabled:opacity-50 ${
            reviewed
              ? "text-emerald-600 hover:text-emerald-800"
              : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <FontAwesomeIcon icon={reviewed ? faCircleCheck : faCircle} />
        </button>
      )}

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Chat actions"
          aria-expanded={open}
          className="text-base text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-1"
        >
          <FontAwesomeIcon icon={faEllipsisVertical} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50">
            {reviewedInMenu && (
              <button
                onClick={() => {
                  setOpen(false);
                  toggleReviewed();
                }}
                disabled={busy}
                className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                <FontAwesomeIcon
                  icon={reviewed ? faCircleCheck : faCircle}
                  fixedWidth
                  className={reviewed ? "text-emerald-600" : "text-slate-400 dark:text-slate-500"}
                />
                {reviewed ? "Reviewed" : "Mark reviewed"}
              </button>
            )}
            <a
              href={`/api/chats/${chatId}/export`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <FontAwesomeIcon
                icon={faFileExport}
                fixedWidth
                className="text-slate-400 dark:text-slate-500"
              />
              Export
            </a>
            {onEditNote && (
              <button
                onClick={() => {
                  setOpen(false);
                  onEditNote();
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <FontAwesomeIcon
                  icon={faNoteSticky}
                  fixedWidth
                  className="text-slate-400 dark:text-slate-500"
                />
                {hasNotes ? "Edit note" : "Add note"}
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faTrashCan} fixedWidth />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

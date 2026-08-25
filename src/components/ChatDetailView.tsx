"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisVertical,
  faFileExport,
  faCircleCheck,
  faCircle,
  faTrashCan,
  faNoteSticky,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import type { ChatDetail, Tag } from "@/lib/repo";
import { formatChatDate } from "@/lib/formatDate";
import ChatTitleEditor from "@/components/ChatTitleEditor";
import ChatTagEditor from "@/components/ChatTagEditor";
import ChatMessageList from "@/components/ChatMessageList";
import DuplicateReviewPanel from "@/components/DuplicateReviewPanel";
import LowValueReviewPanel from "@/components/LowValueReviewPanel";
import NoteEditModal from "@/components/NoteEditModal";

export default function ChatDetailView({
  chat,
  chatTags,
  messageTags,
}: {
  chat: ChatDetail;
  chatTags: Tag[];
  messageTags: Tag[];
}) {
  const router = useRouter();
  const [reviewed, setReviewed] = useState(chat.reviewed);
  const [reviewedBusy, setReviewedBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [notes, setNotes] = useState(chat.notes ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  async function toggleReviewed() {
    if (reviewedBusy) return;
    setReviewedBusy(true);
    const next = !reviewed;
    setReviewed(next);
    try {
      await fetch(`/api/chats/${chat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed: next }),
      });
      router.refresh();
    } finally {
      setReviewedBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${chat.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    setMenuOpen(false);
    try {
      await fetch(`/api/chats/${chat.id}`, { method: "DELETE" });
      router.push("/chats");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const formattedDate = formatChatDate(chat.chatDate);
  const hasNotes = notes.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formattedDate} · {chat.messageCount} messages
        </p>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center flex-wrap gap-2 min-w-0">
            <ChatTitleEditor chatId={chat.id} title={chat.title} />
            <ChatTagEditor chatId={chat.id} tags={chat.tags} allTags={chatTags} />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setShowFilters((s) => !s)}
              title="Search / filter messages"
              aria-label="Search / filter messages"
              aria-pressed={showFilters}
              className={`text-base px-1 ${
                showFilters
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>
            <button
              onClick={toggleReviewed}
              disabled={reviewedBusy}
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Chat actions"
                aria-expanded={menuOpen}
                className="text-base text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-1"
              >
                <FontAwesomeIcon icon={faEllipsisVertical} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50">
                  <a
                    href={`/api/chats/${chat.id}/export`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <FontAwesomeIcon
                      icon={faFileExport}
                      fixedWidth
                      className="text-slate-400 dark:text-slate-500"
                    />
                    Export
                  </a>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setEditingNote(true);
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
        </div>
        {hasNotes && (
          <div
            onClick={() => setEditingNote(true)}
            className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
          >
            <ReactMarkdown>{notes}</ReactMarkdown>
          </div>
        )}
      </div>

      <DuplicateReviewPanel messages={chat.messages} />

      <LowValueReviewPanel messages={chat.messages} />

      <ChatMessageList messages={chat.messages} allTags={messageTags} showFilters={showFilters} />

      {editingNote && (
        <NoteEditModal
          chatId={chat.id}
          initialNotes={notes}
          onClose={() => setEditingNote(false)}
          onSaved={setNotes}
        />
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan, faCircleCheck, faCircle } from "@fortawesome/free-solid-svg-icons";
import type { ChatSummary, Tag } from "@/lib/repo";
import TagManager from "@/components/TagManager";

export default function ChatCard({ chat, allTags }: { chat: ChatSummary; allTags: Tag[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [reviewed, setReviewed] = useState(chat.reviewed);
  const [togglingReviewed, setTogglingReviewed] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${chat.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/chats/${chat.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleReviewed() {
    if (togglingReviewed) return;
    setTogglingReviewed(true);
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
      setTogglingReviewed(false);
    }
  }

  async function handleAddTag(tagName: string) {
    await fetch(`/api/chats/${chat.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagName }),
    });
    router.refresh();
  }

  async function handleRemoveTag(tagId: number) {
    await fetch(`/api/chats/${chat.id}/tags/${tagId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div
      className={`bg-white dark:bg-slate-800 border rounded-xl p-4 flex items-start justify-between gap-4 ${
        reviewed ? "border-slate-200 dark:border-slate-700 opacity-70" : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="min-w-0 flex-1">
        <Link
          href={`/chats/${chat.id}`}
          className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block"
        >
          {chat.title}
        </Link>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {new Date(chat.chatDate.replace(" ", "T")).toLocaleString()} · {chat.messageCount}{" "}
          messages
        </p>
        <div className="mt-2">
          <TagManager
            tags={chat.tags}
            allTags={allTags}
            onAdd={handleAddTag}
            onRemove={handleRemoveTag}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handleToggleReviewed}
          disabled={togglingReviewed}
          className={`flex items-center gap-1.5 text-xs disabled:opacity-50 ${
            reviewed ? "text-emerald-600 hover:text-emerald-800" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <FontAwesomeIcon icon={reviewed ? faCircleCheck : faCircle} />
          {reviewed ? "Reviewed" : "Mark reviewed"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faTrashCan} />
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

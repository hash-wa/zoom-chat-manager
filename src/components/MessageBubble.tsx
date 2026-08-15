"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Message, Tag } from "@/lib/repo";
import { splitSender } from "@/lib/parseZoomChat";
import { linkifyWithHighlight, highlightText } from "@/lib/linkify";
import { extractReactions } from "@/lib/reactions";
import TagManager from "@/components/TagManager";

export default function MessageBubble({
  message,
  allTags,
  isReply = false,
  query = "",
  selectMode = false,
  selected,
  onToggleSelect,
}: {
  message: Message;
  allTags: Tag[];
  isReply?: boolean;
  query?: string;
  selectMode?: boolean;
  selected?: Set<number>;
  onToggleSelect?: (id: number) => void;
}) {
  const router = useRouter();
  const [starred, setStarred] = useState(message.starred);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { name, to } = splitSender(message.sender);
  const { cleanBody, reactions } = extractReactions(message.body);

  async function toggleStar() {
    if (busy) return;
    setBusy(true);
    const next = !starred;
    setStarred(next);
    try {
      await fetch(`/api/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleAddTag(tagName: string) {
    await fetch(`/api/messages/${message.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagName }),
    });
    router.refresh();
  }

  async function handleRemoveTag(tagId: number) {
    await fetch(`/api/messages/${message.id}/tags/${tagId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  async function handleDelete() {
    const replyCount = message.replies.length;
    const warning =
      replyCount > 0
        ? `Delete this message? Its ${replyCount} repl${replyCount === 1 ? "y" : "ies"} will move out of this thread instead of being deleted.`
        : "Delete this message? This cannot be undone.";
    if (!confirm(warning)) return;
    setDeleting(true);
    try {
      await fetch(`/api/messages/${message.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div
        id={`message-${message.seq}`}
        className={`group rounded-lg px-3 py-2 border scroll-mt-20 ${
          starred
            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
            : isReply
              ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selected?.has(message.id) ?? false}
                  onChange={() => onToggleSelect?.(message.id)}
                  aria-label="Select message"
                />
              )}
              {isReply && (
                <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
                  ↳
                </span>
              )}
              <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                {highlightText(name, query)}
              </span>
              {to && <span className="text-xs text-slate-400 dark:text-slate-500">to {to}</span>}
              <span className="text-xs text-slate-400 dark:text-slate-500">{message.timestampRaw}</span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap mt-0.5 break-words">
              {linkifyWithHighlight(cleanBody, query)}
            </p>
            {reactions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {reactions.map((r, i) => (
                  <span
                    key={i}
                    title={r.names.join(", ")}
                    className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 rounded-full px-2 py-0.5"
                  >
                    <span>{r.emoji}</span>
                    <span className="text-slate-500 dark:text-slate-400">{r.names.length}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete message"
              className="text-xs text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition disabled:opacity-100"
            >
              {deleting ? "…" : "🗑"}
            </button>
            <button
              onClick={toggleStar}
              disabled={busy}
              aria-label={starred ? "Unstar message" : "Star message"}
              className={`text-lg leading-none ${
                starred ? "text-amber-500" : "text-slate-300 dark:text-slate-600 hover:text-slate-400"
              }`}
            >
              {starred ? "★" : "☆"}
            </button>
          </div>
        </div>

        {starred && (
          <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
            <TagManager
              tags={message.tags}
              allTags={allTags}
              onAdd={handleAddTag}
              onRemove={handleRemoveTag}
            />
          </div>
        )}
      </div>

      {message.replies.length > 0 && (
        <div className="ml-8 mt-2 space-y-2 border-l-2 border-indigo-200 pl-3">
          {message.replies.map((reply) => (
            <MessageBubble
              key={reply.id}
              message={reply}
              allTags={allTags}
              isReply
              query={query}
              selectMode={selectMode}
              selected={selected}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

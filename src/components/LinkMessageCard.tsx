"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan, faCircleCheck, faCircle } from "@fortawesome/free-solid-svg-icons";
import type { LinkMessage, Tag } from "@/lib/repo";
import { splitSender } from "@/lib/parseZoomChat";
import { linkifyWithHighlight, highlightText } from "@/lib/linkify";
import { extractReactions } from "@/lib/reactions";
import TagManager from "@/components/TagManager";

export default function LinkMessageCard({
  m,
  query = "",
  showConnected = false,
  allTags,
  showActions = false,
}: {
  m: LinkMessage;
  query?: string;
  showConnected?: boolean;
  allTags?: Tag[];
  showActions?: boolean;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(m.connected);
  const [starred, setStarred] = useState(m.starred);
  const [busy, setBusy] = useState(false);
  const [starBusy, setStarBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { name, to } = splitSender(m.sender);
  const { cleanBody, reactions } = extractReactions(m.body);

  async function toggleConnected() {
    if (busy) return;
    setBusy(true);
    const next = !connected;
    setConnected(next);
    try {
      await fetch(`/api/messages/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connected: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleStar() {
    if (starBusy) return;
    setStarBusy(true);
    const next = !starred;
    setStarred(next);
    try {
      await fetch(`/api/messages/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: next }),
      });
      router.refresh();
    } finally {
      setStarBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/messages/${m.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddTag(tagName: string) {
    await fetch(`/api/messages/${m.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagName }),
    });
    router.refresh();
  }

  async function handleRemoveTag(tagId: number) {
    await fetch(`/api/messages/${m.id}/tags/${tagId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div
      className={`group bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 transition ${
        connected ? "border-emerald-300" : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/chats/${m.chatId}#message-${m.seq}`}
              className="flex items-baseline gap-2 flex-wrap min-w-0 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <span className="font-medium text-slate-900 dark:text-slate-100">{highlightText(name, query)}</span>
              {to && <span>to {to}</span>}
              <span>{m.timestampRaw}</span>
              <span className="text-slate-400 dark:text-slate-500">· {m.chatTitle}</span>
            </Link>
            {showActions && (
              <button
                onClick={toggleStar}
                disabled={starBusy}
                aria-label={starred ? "Unstar message" : "Star message"}
                className={`text-base leading-none opacity-0 group-hover:opacity-100 transition ${
                  starred ? "text-amber-500" : "text-slate-300 dark:text-slate-600 hover:text-slate-400"
                }`}
              >
                {starred ? "★" : "☆"}
              </button>
            )}
            {allTags && (
              <TagManager
                tags={m.tags}
                allTags={allTags}
                onAdd={handleAddTag}
                onRemove={handleRemoveTag}
                placeholder="+"
                compact
                inputHoverOnly
              />
            )}
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
        {showActions && (
          <div className="flex items-center gap-2 shrink-0">
            {showConnected && (
              <button
                onClick={toggleConnected}
                disabled={busy}
                aria-label={connected ? "Mark as unchecked" : "Mark as checked"}
                className={`text-base leading-none opacity-0 group-hover:opacity-100 transition disabled:opacity-50 ${
                  connected ? "text-emerald-600 hover:text-emerald-800" : "text-slate-300 dark:text-slate-600 hover:text-slate-400"
                }`}
              >
                <FontAwesomeIcon icon={connected ? faCircleCheck : faCircle} />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete message"
              className="text-sm text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition disabled:opacity-100"
            >
              <FontAwesomeIcon icon={faTrashCan} fixedWidth />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan, faCircleCheck, faCircle } from "@fortawesome/free-solid-svg-icons";
import type { Message, Tag } from "@/lib/repo";
import { splitSender } from "@/lib/parseZoomChat";
import { linkifyWithHighlight, highlightText } from "@/lib/linkify";
import { extractReactions } from "@/lib/reactions";
import TagManager from "@/components/TagManager";
import { useUndoDelete } from "@/components/UndoDeleteProvider";

export default function MessageBubble({
  message,
  allTags,
  isReply = false,
  query = "",
  selectMode = false,
  selected,
  onToggleSelect,
  focused = false,
}: {
  message: Message;
  allTags: Tag[];
  isReply?: boolean;
  query?: string;
  selectMode?: boolean;
  selected?: Set<number>;
  onToggleSelect?: (id: number) => void;
  focused?: boolean;
}) {
  const router = useRouter();
  const { isPending, scheduleDelete } = useUndoDelete();
  const [starred, setStarred] = useState(message.starred);
  const [connected, setConnected] = useState(message.connected);
  const [busy, setBusy] = useState(false);
  const [connectedBusy, setConnectedBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
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

  async function toggleConnected() {
    if (connectedBusy) return;
    setConnectedBusy(true);
    const next = !connected;
    setConnected(next);
    try {
      await fetch(`/api/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connected: next }),
      });
      router.refresh();
    } finally {
      setConnectedBusy(false);
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

  function handleDelete() {
    scheduleDelete({
      id: message.id,
      label: "Message deleted",
      onExpire: async () => {
        await fetch(`/api/messages/${message.id}`, { method: "DELETE" });
        router.refresh();
      },
    });
  }

  useEffect(() => {
    if (focused) rootRef.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  // Re-attaches on every render (while focused) rather than depending only
  // on `focused`, so the closure never goes stale mid-session - toggleStar
  // etc. are redefined each render and reference the latest starred/busy
  // state, and without them in the deps a rapid second keypress would
  // re-invoke a frozen version of the handler still holding the old state.
  useEffect(() => {
    if (!focused) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "s") {
        e.preventDefault();
        toggleStar();
      } else if (e.key === "x") {
        e.preventDefault();
        toggleConnected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  if (isPending(message.id)) return null;

  return (
    <div>
      <div
        ref={rootRef}
        id={`message-${message.seq}`}
        className={`group rounded-lg px-3 py-2 border scroll-mt-20 ${
          focused ? "ring-2 ring-indigo-400 dark:ring-indigo-500" : ""
        } ${
          starred
            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
            : connected
              ? "bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700"
              : isReply
                ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
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
              <button
                onClick={toggleStar}
                disabled={busy}
                aria-label={starred ? "Unstar message" : "Star message"}
                className={`text-base leading-none transition ${focused ? "opacity-100" : "opacity-0 group-hover:opacity-100"} ${
                  starred ? "text-amber-500" : "text-slate-300 dark:text-slate-600 hover:text-slate-400"
                }`}
              >
                {starred ? "★" : "☆"}
              </button>
              <TagManager
                tags={message.tags}
                allTags={allTags}
                onAdd={handleAddTag}
                onRemove={handleRemoveTag}
                placeholder="+"
                compact
                inputHoverOnly
              />
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
              onClick={toggleConnected}
              disabled={connectedBusy}
              aria-label={connected ? "Mark as unchecked" : "Mark as checked"}
              className={`text-base leading-none transition disabled:opacity-50 ${focused ? "opacity-100" : "opacity-0 group-hover:opacity-100"} ${
                connected ? "text-emerald-600 hover:text-emerald-800" : "text-slate-300 dark:text-slate-600 hover:text-slate-400"
              }`}
            >
              <FontAwesomeIcon icon={connected ? faCircleCheck : faCircle} />
            </button>
            <button
              onClick={handleDelete}
              aria-label="Delete message"
              className={`text-sm text-slate-300 dark:text-slate-600 hover:text-red-500 transition ${focused ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            >
              <FontAwesomeIcon icon={faTrashCan} fixedWidth />
            </button>
          </div>
        </div>
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

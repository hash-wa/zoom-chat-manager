"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Message, Tag } from "@/lib/repo";
import MessageBubble from "@/components/MessageBubble";

function textMatches(message: Message, query: string): boolean {
  return (
    message.body.toLowerCase().includes(query) || message.sender.toLowerCase().includes(query)
  );
}

// A top-level message stays visible if it or any of its (nested) replies
// match, so a matching reply never loses its surrounding thread context.
function treeMatches(message: Message, query: string): boolean {
  return textMatches(message, query) || message.replies.some((r) => treeMatches(r, query));
}

function countMatches(messages: Message[], query: string): number {
  let count = 0;
  for (const m of messages) {
    if (textMatches(m, query)) count++;
    count += countMatches(m.replies, query);
  }
  return count;
}

function collectIds(messages: Message[]): number[] {
  const ids: number[] = [];
  const walk = (msgs: Message[]) => {
    for (const m of msgs) {
      ids.push(m.id);
      walk(m.replies);
    }
  };
  walk(messages);
  return ids;
}

export default function ChatMessageList({
  messages,
  allTags,
}: {
  messages: Message[];
  allTags: Tag[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  const visible = useMemo(
    () => (normalizedQuery ? messages.filter((m) => treeMatches(m, normalizedQuery)) : messages),
    [messages, normalizedQuery]
  );
  const matchCount = useMemo(
    () => (normalizedQuery ? countMatches(messages, normalizedQuery) : 0),
    [messages, normalizedQuery]
  );

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(collectIds(visible)));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Delete ${selected.size} selected message${selected.size === 1 ? "" : "s"}? Any of their replies will move out of the thread instead of being deleted.`
      )
    )
      return;
    setDeleting(true);
    try {
      await Promise.all(
        [...selected].map((id) => fetch(`/api/messages/${id}`, { method: "DELETE" }))
      );
      setSelected(new Set());
      setSelectMode(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this chat..."
          className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg pl-3 pr-16 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {query && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {matchCount} match{matchCount === 1 ? "" : "es"}
            </span>
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {!selectMode ? (
          <button
            onClick={() => setSelectMode(true)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Select messages
          </button>
        ) : (
          <>
            <span className="text-slate-500 dark:text-slate-400">{selected.size} selected</span>
            <button onClick={selectAllVisible} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
              Select all
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={selected.size === 0 || deleting}
              className="text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : `Delete selected`}
            </button>
            <button onClick={exitSelectMode} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              Cancel
            </button>
          </>
        )}
      </div>

      <div className="space-y-2 pt-2">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No messages could be parsed from this chat.</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No messages match &ldquo;{query}&rdquo;.</p>
        ) : (
          visible.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              allTags={allTags}
              query={normalizedQuery}
              selectMode={selectMode}
              selected={selected}
              onToggleSelect={toggleSelected}
            />
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatSummary, Tag } from "@/lib/repo";
import ChatCard from "@/components/ChatCard";

export default function ChatsBulkManager({
  chats,
  allTags,
}: {
  chats: ChatSummary[];
  allTags: Tag[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [removeTagId, setRemoveTagId] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setTagInput("");
    setRemoveTagId("");
  }

  async function handleAddTag() {
    const name = tagInput.trim();
    if (!name || selected.size === 0 || busy) return;
    setBusy(true);
    try {
      await fetch("/api/chats/bulk-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatIds: Array.from(selected), tagName: name }),
      });
      clearSelection();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveTag() {
    const tagId = Number(removeTagId);
    if (!tagId || selected.size === 0 || busy) return;
    setBusy(true);
    try {
      await fetch("/api/chats/bulk-tags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatIds: Array.from(selected), tagId }),
      });
      clearSelection();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2 text-sm">
          <span className="font-medium text-indigo-900 dark:text-indigo-200 shrink-0">
            {selected.size} selected
          </span>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddTag();
            }}
            className="flex items-center gap-1"
          >
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag..."
              list="bulk-chat-tag-suggestions"
              className="text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-full px-2.5 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="bulk-chat-tag-suggestions">
              {allTags.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
            <button
              type="submit"
              disabled={busy || !tagInput.trim()}
              className="text-xs bg-indigo-600 text-white rounded-full px-2.5 py-1 hover:bg-indigo-700 disabled:opacity-50"
            >
              Add
            </button>
          </form>

          {allTags.length > 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRemoveTag();
              }}
              className="flex items-center gap-1"
            >
              <select
                value={removeTagId}
                onChange={(e) => setRemoveTagId(e.target.value)}
                className="text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-full px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Remove tag...</option>
                {allTags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={busy || !removeTagId}
                className="text-xs bg-red-500 text-white rounded-full px-2.5 py-1 hover:bg-red-600 disabled:opacity-50"
              >
                Remove
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-indigo-700 dark:text-indigo-300 hover:underline ml-auto shrink-0"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="space-y-3">
        {chats.map((chat) => (
          <div key={chat.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={selected.has(chat.id)}
              onChange={() => toggle(chat.id)}
              aria-label={`Select ${chat.title}`}
              className="mt-5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <ChatCard chat={chat} allTags={allTags} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

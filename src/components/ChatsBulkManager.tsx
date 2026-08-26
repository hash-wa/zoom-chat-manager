"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faListCheck,
  faArrowDownWideShort,
  faArrowUpWideShort,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import type { ChatSummary, TagWithCount, LinkMessage, Tag } from "@/lib/repo";
import ChatCard from "@/components/ChatCard";
import ChatTagFilterBar from "@/components/ChatTagFilterBar";

type ChatWithMatches = ChatSummary & { matches: LinkMessage[] };

function toolbarIconClass(active: boolean) {
  return `w-7 h-7 inline-flex items-center justify-center rounded-lg border text-sm ${
    active
      ? "bg-indigo-600 text-white border-indigo-600"
      : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
  }`;
}

function buildHref(
  tagId: number | undefined,
  sort: "asc" | "desc",
  extra: { q?: string; from?: string; to?: string }
) {
  const params = new URLSearchParams();
  if (tagId) params.set("tag", String(tagId));
  if (sort === "asc") params.set("sort", "asc");
  if (extra.q) params.set("q", extra.q);
  if (extra.from) params.set("from", extra.from);
  if (extra.to) params.set("to", extra.to);
  const qs = params.toString();
  return qs ? `/chats?${qs}` : "/chats";
}

export default function ChatsBulkManager({
  chats,
  allTags,
  messageTags,
  activeTagId,
  sort,
  query,
  from,
  to,
}: {
  chats: ChatWithMatches[];
  allTags: TagWithCount[];
  messageTags: Tag[];
  activeTagId?: number;
  sort: "asc" | "desc";
  query: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const hasActiveFilters = Boolean(activeTagId || query || from || to);
  const [filterOpen, setFilterOpen] = useState(hasActiveFilters);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tagInput, setTagInput] = useState("");
  const [removeTagId, setRemoveTagId] = useState("");
  const [busy, setBusy] = useState(false);

  const [qInput, setQInput] = useState(query);
  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstFilterRender = useRef(true);

  // Instant filtering: navigates a beat after the last change, so results
  // update without needing to press Enter/Apply.
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.replace(buildHref(activeTagId, sort, { q: qInput, from: fromInput, to: toInput }));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput, fromInput, toInput]);

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

  function toggleSelectMode() {
    setSelectMode((prev) => {
      if (prev) clearSelection();
      return !prev;
    });
  }

  function clearSearch() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQInput("");
    setFromInput("");
    setToInput("");
    router.replace(buildHref(activeTagId, sort, {}));
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Chats</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            title={filterOpen ? "Hide search & filter" : "Search & filter"}
            aria-label={filterOpen ? "Hide search & filter" : "Search & filter"}
            className={toolbarIconClass(filterOpen || hasActiveFilters)}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </button>
          <button
            type="button"
            onClick={toggleSelectMode}
            title={selectMode ? "Cancel selection" : "Select chats"}
            aria-label={selectMode ? "Cancel selection" : "Select chats"}
            className={toolbarIconClass(selectMode)}
          >
            <FontAwesomeIcon icon={faListCheck} />
          </button>
          <div className="flex items-center gap-1">
            <Link
              href={buildHref(activeTagId, "desc", { q: query, from, to })}
              title="Newest first"
              aria-label="Sort by newest first"
              className={toolbarIconClass(sort === "desc")}
            >
              <FontAwesomeIcon icon={faArrowDownWideShort} />
            </Link>
            <Link
              href={buildHref(activeTagId, "asc", { q: query, from, to })}
              title="Oldest first"
              aria-label="Sort by oldest first"
              className={toolbarIconClass(sort === "asc")}
            >
              <FontAwesomeIcon icon={faArrowUpWideShort} />
            </Link>
          </div>
        </div>
      </div>

      {filterOpen && (
        <div className="space-y-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[12rem]">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                size="xs"
              />
              <input
                type="text"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Search chat titles and messages..."
                autoFocus
                className="w-full text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg pl-7 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <input
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              title="From"
              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              title="To"
              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {(qInput || fromInput || toInput) && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-xs text-slate-500 dark:text-slate-400 hover:underline shrink-0"
              >
                Clear search
              </button>
            )}
          </div>

          <ChatTagFilterBar tags={allTags} activeTagId={activeTagId} sort={sort} q={query} from={from} to={to} />
        </div>
      )}

      {selectMode && selected.size > 0 && (
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

      {chats.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No chats match your search or filter.</p>
      ) : (
        <div className={query.trim() ? "space-y-10" : "space-y-3"}>
          {chats.map((chat) =>
            selectMode ? (
              <div key={chat.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.has(chat.id)}
                  onChange={() => toggle(chat.id)}
                  aria-label={`Select ${chat.title}`}
                  className="mt-5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <ChatCard chat={chat} allTags={allTags} messageTags={messageTags} query={query} matches={chat.matches} />
                </div>
              </div>
            ) : (
              <ChatCard key={chat.id} chat={chat} allTags={allTags} messageTags={messageTags} query={query} matches={chat.matches} />
            )
          )}
        </div>
      )}
    </div>
  );
}

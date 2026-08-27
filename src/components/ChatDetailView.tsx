"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  faListCheck,
  faLink,
} from "@fortawesome/free-solid-svg-icons";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";
import type { ChatDetail, Message, Tag } from "@/lib/repo";
import { formatChatDate } from "@/lib/formatDate";
import { hasLinkedInLink, hasOtherLink } from "@/lib/links";
import ChatTitleEditor from "@/components/ChatTitleEditor";
import ChatTagEditor from "@/components/ChatTagEditor";
import ChatMessageList from "@/components/ChatMessageList";
import DuplicateReviewPanel from "@/components/DuplicateReviewPanel";
import LowValueReviewPanel from "@/components/LowValueReviewPanel";
import NoteEditModal from "@/components/NoteEditModal";

type LinkFilter = "linkedin" | "links" | null;
type CheckedState = "checked" | "unchecked" | null;

function toolbarIconClass(active: boolean) {
  return `w-7 h-7 inline-flex items-center justify-center rounded-lg border text-sm ${
    active
      ? "bg-indigo-600 text-white border-indigo-600"
      : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
  }`;
}

function pillClass(active: boolean) {
  return `flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm ${
    active
      ? "bg-indigo-600 text-white border-indigo-600"
      : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
  }`;
}

function textMatches(message: Message, query: string): boolean {
  return (
    message.body.toLowerCase().includes(query) || message.sender.toLowerCase().includes(query)
  );
}

function linkFilterMatches(message: Message, filter: LinkFilter): boolean {
  if (!filter) return true;
  return filter === "linkedin" ? hasLinkedInLink(message.body) : hasOtherLink(message.body);
}

function checkedMatches(message: Message, checkedState: CheckedState): boolean {
  if (!checkedState) return true;
  return checkedState === "checked" ? message.connected : !message.connected;
}

// A top-level message stays visible if it or any of its (nested) replies
// match, so a matching reply never loses its surrounding thread context.
function treeMatches(message: Message, query: string, filter: LinkFilter, checkedState: CheckedState): boolean {
  return (
    (textMatches(message, query) && linkFilterMatches(message, filter) && checkedMatches(message, checkedState)) ||
    message.replies.some((r) => treeMatches(r, query, filter, checkedState))
  );
}

function countMatches(messages: Message[], query: string, filter: LinkFilter, checkedState: CheckedState): number {
  let count = 0;
  for (const m of messages) {
    if (textMatches(m, query) && linkFilterMatches(m, filter) && checkedMatches(m, checkedState)) count++;
    count += countMatches(m.replies, query, filter, checkedState);
  }
  return count;
}

// Flattened count of individual messages (including replies) matching a
// link category - used for the "LinkedIn (N)" / "Links (N)" filter pills,
// independent of the text search or the other filter.
function countLinkMatches(messages: Message[], filter: "linkedin" | "links"): number {
  let count = 0;
  for (const m of messages) {
    if (linkFilterMatches(m, filter)) count++;
    count += countLinkMatches(m.replies, filter);
  }
  return count;
}

// Counts messages matching the current text search + link filter that are
// (un)checked - independent of checkedState itself, so the Checked/Unchecked
// pills always show accurate totals for what's currently available.
function countByChecked(messages: Message[], query: string, filter: LinkFilter, wantConnected: boolean): number {
  let count = 0;
  for (const m of messages) {
    if (textMatches(m, query) && linkFilterMatches(m, filter) && m.connected === wantConnected) count++;
    count += countByChecked(m.replies, query, filter, wantConnected);
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
  const [deletingChat, setDeletingChat] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [notes, setNotes] = useState(chat.notes ?? "");
  const menuRef = useRef<HTMLDivElement>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");
  const [linkFilter, setLinkFilter] = useState<LinkFilter>(null);
  const [checkedState, setCheckedState] = useState<CheckedState>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deletingMessages, setDeletingMessages] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLowerCase();

  const linkedInCount = useMemo(() => countLinkMatches(chat.messages, "linkedin"), [chat.messages]);
  const linksCount = useMemo(() => countLinkMatches(chat.messages, "links"), [chat.messages]);
  const checkedCount = useMemo(
    () => countByChecked(chat.messages, normalizedQuery, linkFilter, true),
    [chat.messages, normalizedQuery, linkFilter]
  );
  const uncheckedCount = useMemo(
    () => countByChecked(chat.messages, normalizedQuery, linkFilter, false),
    [chat.messages, normalizedQuery, linkFilter]
  );

  const visible = useMemo(
    () =>
      normalizedQuery || linkFilter || checkedState
        ? chat.messages.filter((m) => treeMatches(m, normalizedQuery, linkFilter, checkedState))
        : chat.messages,
    [chat.messages, normalizedQuery, linkFilter, checkedState]
  );
  const matchCount = useMemo(
    () =>
      normalizedQuery || linkFilter || checkedState
        ? countMatches(chat.messages, normalizedQuery, linkFilter, checkedState)
        : 0,
    [chat.messages, normalizedQuery, linkFilter, checkedState]
  );

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

  // Keyboard focus tracks top-level messages only (not nested replies), and
  // resets when the user actually changes the search/filter - not on every
  // data refresh (star/check/delete all call router.refresh(), which would
  // otherwise hand this a new `messages` array and wipe focus after every
  // single keyboard action).
  useEffect(() => {
    setFocusedIndex(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedQuery, linkFilter, checkedState]);

  // Focuses the search box whenever it's revealed, whether that came from
  // clicking the toggle button or from the "/" shortcut below.
  useEffect(() => {
    if (showFilters) searchInputRef.current?.focus();
  }, [showFilters]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Escape must work even while the search box itself has focus, so it
      // has to run before the isTyping guard below.
      if (e.key === "Escape") {
        setFocusedIndex(-1);
        if (showFilters) {
          if (query || linkFilter || checkedState) {
            // First Escape clears the search but leaves the panel open.
            setQuery("");
            setLinkFilter(null);
            setCheckedState(null);
          } else {
            // Second Escape (already empty) closes the panel.
            setShowFilters(false);
            (document.activeElement as HTMLElement | null)?.blur();
          }
        }
        return;
      }

      const target = e.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        if (!showFilters) setShowFilters(true);
        else searchInputRef.current?.focus();
        return;
      }

      if (visible.length === 0) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, visible.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // No dependency array: re-attaches every render so the closure always
    // sees the latest query/linkFilter/showFilters instead of a frozen
    // snapshot from whenever the effect last ran.
  });

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
    setDeletingChat(true);
    setMenuOpen(false);
    try {
      await fetch(`/api/chats/${chat.id}`, { method: "DELETE" });
      router.push("/chats");
      router.refresh();
    } finally {
      setDeletingChat(false);
    }
  }

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
    setDeletingMessages(true);
    try {
      await Promise.all(
        [...selected].map((id) => fetch(`/api/messages/${id}`, { method: "DELETE" }))
      );
      setSelected(new Set());
      setSelectMode(false);
      router.refresh();
    } finally {
      setDeletingMessages(false);
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
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center flex-wrap gap-2 min-w-0">
            <ChatTitleEditor chatId={chat.id} title={chat.title} />
            <ChatTagEditor chatId={chat.id} tags={chat.tags} allTags={chatTags} />
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {linkedInCount > 0 && (
              <button
                onClick={() => {
                  setLinkFilter((f) => (f === "linkedin" ? null : "linkedin"));
                  setCheckedState(null);
                }}
                title="LinkedIn"
                aria-label="Filter LinkedIn messages"
                className={pillClass(linkFilter === "linkedin")}
              >
                <FontAwesomeIcon
                  icon={faLinkedin}
                  className={linkFilter === "linkedin" ? "text-white" : "text-[#0A66C2]"}
                />
                <span className="opacity-60">({linkedInCount})</span>
              </button>
            )}
            {linksCount > 0 && (
              <button
                onClick={() => {
                  setLinkFilter((f) => (f === "links" ? null : "links"));
                  setCheckedState(null);
                }}
                title="Links"
                aria-label="Filter other link messages"
                className={pillClass(linkFilter === "links")}
              >
                <FontAwesomeIcon
                  icon={faLink}
                  className={linkFilter === "links" ? "text-white" : "text-slate-400 dark:text-slate-500"}
                />
                <span className="opacity-60">({linksCount})</span>
              </button>
            )}
            <button
              onClick={() => setShowFilters((s) => !s)}
              title="Search / filter messages"
              aria-label="Search / filter messages"
              aria-pressed={showFilters}
              className={toolbarIconClass(showFilters)}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>
            <button
              type="button"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              title={selectMode ? "Cancel selection" : "Select messages"}
              aria-label={selectMode ? "Cancel selection" : "Select messages"}
              className={toolbarIconClass(selectMode)}
            >
              <FontAwesomeIcon icon={faListCheck} />
            </button>
            <button
              onClick={toggleReviewed}
              disabled={reviewedBusy}
              title={reviewed ? "Reviewed" : "Mark reviewed"}
              aria-label={reviewed ? "Reviewed" : "Mark reviewed"}
              className={`w-7 h-7 inline-flex items-center justify-center rounded-lg border text-sm disabled:opacity-50 ${
                reviewed
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <FontAwesomeIcon icon={reviewed ? faCircleCheck : faCircle} />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Chat actions"
                aria-expanded={menuOpen}
                className={toolbarIconClass(menuOpen)}
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
                    disabled={deletingChat}
                    className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faTrashCan} fixedWidth />
                    {deletingChat ? "Deleting..." : "Delete"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {linkFilter && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setCheckedState((s) => (s === "checked" ? null : "checked"))}
              title="Checked"
              aria-label="Filter checked messages"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm transition ${
                checkedState === "checked"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <FontAwesomeIcon icon={faCircleCheck} className={checkedState === "checked" ? "text-white" : "text-emerald-500"} />
              Checked <span className="opacity-60">({checkedCount})</span>
            </button>
            <button
              onClick={() => setCheckedState((s) => (s === "unchecked" ? null : "unchecked"))}
              title="Unchecked"
              aria-label="Filter unchecked messages"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm transition ${
                checkedState === "unchecked"
                  ? "bg-slate-600 text-white border-slate-600"
                  : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <FontAwesomeIcon icon={faCircle} className={checkedState === "unchecked" ? "text-white" : "text-slate-400 dark:text-slate-500"} />
              Unchecked <span className="opacity-60">({uncheckedCount})</span>
            </button>
          </div>
        )}

        {selectMode && (
          <div className="flex flex-wrap items-center gap-3 text-sm pt-1">
            <span className="text-slate-500 dark:text-slate-400">{selected.size} selected</span>
            <button onClick={selectAllVisible} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
              Select all
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={selected.size === 0 || deletingMessages}
              className="text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {deletingMessages ? "Deleting..." : "Delete selected"}
            </button>
          </div>
        )}

        {showFilters && (
          <div className="relative pt-1">
            <input
              ref={searchInputRef}
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
        )}

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

      <ChatMessageList
        messages={visible}
        hasMessages={chat.messages.length > 0}
        emptyMessage={
          query ? (
            <>No messages match &ldquo;{query}&rdquo;.</>
          ) : (
            `No${checkedState ? ` ${checkedState}` : ""} messages with ${linkFilter === "linkedin" ? "LinkedIn" : "other"} links.`
          )
        }
        allTags={messageTags}
        query={normalizedQuery}
        selectMode={selectMode}
        selected={selected}
        onToggleSelect={toggleSelected}
        focusedIndex={focusedIndex}
      />

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

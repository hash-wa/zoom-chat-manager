"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faUpload,
  faComments,
  faBars,
  faChevronDown,
  faChevronRight,
  faLink,
  faMagnifyingGlass,
  faDownload,
  faCircleCheck,
  faCircle,
} from "@fortawesome/free-solid-svg-icons";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";
import type { ChatSummary, TagWithCount } from "@/lib/repo";
import { formatChatDate } from "@/lib/formatDate";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

function sectionRowClass(active: boolean) {
  return `flex-1 text-sm font-medium truncate ${
    active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
  }`;
}

function itemRowClass(active: boolean) {
  return `block px-2 py-1 rounded text-sm truncate ${
    active ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
  }`;
}

export default function Sidebar({
  chats,
  tags,
  untaggedCount,
  linkedInCount,
  linksCount,
}: {
  chats: ChatSummary[];
  tags: TagWithCount[];
  untaggedCount: number;
  linkedInCount: number;
  linksCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [highlightsOpen, setHighlightsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState(pathname === "/search" ? searchParams.get("q") ?? "" : "");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstSearchRender = useRef(true);
  // Kept current on every render (not in an effect) so the debounce
  // callback below can always see the *live* pathname, even if it fires
  // in the brief window before a just-completed navigation's effects run.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Live search: navigates a beat after typing stops, so results update
  // without needing to press Enter. Uses replace (not push) so every
  // keystroke doesn't pile up in browser history.
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const scheduledPathname = pathname;
    searchDebounceRef.current = setTimeout(() => {
      // If the user navigated elsewhere while this was pending, let that
      // navigation stand instead of yanking them back to /search.
      if (pathnameRef.current !== scheduledPathname) return;
      const trimmed = searchQuery.trim();
      if (!trimmed && pathnameRef.current !== "/search") return;
      router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Cancel a pending debounced search-navigation promptly once the
  // pathname actually changes (the ref check above is the real guard;
  // this just avoids a needless no-op fire later).
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
  }, [pathname]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const trimmed = searchQuery.trim();
    router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  const activeChatId = pathname.match(/^\/chats\/(\d+)/)?.[1];
  const activeTag = pathname === "/highlights" ? searchParams.get("tag") : null;

  // Mirrors whatever sort order is active on /chats, so the sidebar list
  // never disagrees with the page you're looking at.
  const currentSort = pathname === "/chats" && searchParams.get("sort") === "asc" ? "asc" : "desc";
  const sortedChats = useMemo(() => {
    const copy = [...chats];
    copy.sort((a, b) =>
      currentSort === "asc" ? a.chatDate.localeCompare(b.chatDate) : b.chatDate.localeCompare(a.chatDate)
    );
    return copy;
  }, [chats, currentSort]);

  if (collapsed) {
    return (
      <div className="w-12 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col items-center py-3">
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-lg"
        >
          <FontAwesomeIcon icon={faBars} fixedWidth />
        </button>

        <div className="flex flex-col items-center gap-3 mt-4">
          <Link
            href="/search"
            title="Search"
            className={`text-lg ${pathname === "/search" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} fixedWidth />
          </Link>

          <div className="relative group">
            <Link
              href="/highlights"
              title={`Highlights (${tags.length + 2})`}
              className={`block text-lg ${pathname === "/highlights" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              <FontAwesomeIcon icon={faStar} fixedWidth />
            </Link>
            <div className="hidden group-hover:block absolute left-full top-0 -ml-1 pl-3 z-50">
              <div className="w-56 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-2">
                <div className="px-3 py-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">
                  Highlights
                </div>
                <Link
                  href="/highlights?tag=linkedin"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <FontAwesomeIcon icon={faLinkedin} className="text-[#0A66C2]" fixedWidth />
                  LinkedIn <span className="text-xs text-slate-400 dark:text-slate-500">({linkedInCount})</span>
                </Link>
                <Link
                  href="/highlights?tag=links"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <FontAwesomeIcon icon={faLink} className="text-slate-400 dark:text-slate-500" fixedWidth />
                  Links <span className="text-xs text-slate-400 dark:text-slate-500">({linksCount})</span>
                </Link>
                {tags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/highlights?tag=${t.id}`}
                    className="block px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 truncate"
                  >
                    {t.name} <span className="text-xs text-slate-400 dark:text-slate-500">({t.count})</span>
                  </Link>
                ))}
                {untaggedCount > 0 && (
                  <Link
                    href="/highlights?tag=untagged"
                    className="block px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Untagged <span className="text-xs text-slate-400 dark:text-slate-500">({untaggedCount})</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="relative group">
            <Link
              href="/chats"
              title={`Chats (${chats.length})`}
              className={`block text-lg ${pathname === "/chats" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              <FontAwesomeIcon icon={faComments} fixedWidth />
            </Link>
            <div className="hidden group-hover:block absolute left-full top-0 -ml-1 pl-3 z-50">
              <div className="w-56 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-2">
                <div className="px-3 py-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Chats</div>
                {sortedChats.length === 0 ? (
                  <p className="px-3 py-1.5 text-xs text-slate-400 dark:text-slate-500">No chats yet</p>
                ) : (
                  sortedChats.map((c) => (
                    <Link
                      key={c.id}
                      href={`/chats/${c.id}`}
                      className="block px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 truncate"
                    >
                      {c.title}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-center gap-3 mb-1">
          <Link
            href="/upload"
            title="Upload"
            className={`text-lg ${pathname === "/upload" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
          >
            <FontAwesomeIcon icon={faUpload} fixedWidth />
          </Link>
          <a
            href="/api/backup"
            title="Download database backup"
            className="text-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <FontAwesomeIcon icon={faDownload} fixedWidth />
          </a>
          <ThemeToggle iconOnly />
          <LogoutButton iconOnly />
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col h-screen sticky top-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">Zoom Chat Manager</span>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 shrink-0 ml-2"
        >
          <FontAwesomeIcon icon={faBars} fixedWidth />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-6">
        <div className="px-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              size="xs"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all chats..."
              className="w-full text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg pl-7 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </form>
        </div>

        <div className="px-2">
          <div className="flex items-center gap-1 px-2">
            <Link
              href="/highlights"
              className={`flex items-center gap-2 ${sectionRowClass(pathname === "/highlights")}`}
            >
              <FontAwesomeIcon icon={faStar} fixedWidth className="text-amber-400" />
              Highlights ({tags.length + 2})
            </Link>
            <button
              onClick={() => setHighlightsOpen((o) => !o)}
              aria-label="Toggle highlights list"
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 px-1 shrink-0"
            >
              <FontAwesomeIcon icon={highlightsOpen ? faChevronDown : faChevronRight} size="xs" />
            </button>
          </div>
          {highlightsOpen && (
            <div className="ml-2 space-y-0.5 mt-1">
              <Link
                href="/highlights?tag=linkedin"
                className={`flex items-center gap-2 ${itemRowClass(activeTag === "linkedin")}`}
              >
                <FontAwesomeIcon icon={faLinkedin} className="text-[#0A66C2]" fixedWidth />
                LinkedIn <span className="text-xs text-slate-400 dark:text-slate-500">({linkedInCount})</span>
              </Link>
              <Link
                href="/highlights?tag=links"
                className={`flex items-center gap-2 ${itemRowClass(activeTag === "links")}`}
              >
                <FontAwesomeIcon icon={faLink} className="text-slate-400 dark:text-slate-500" fixedWidth />
                Links <span className="text-xs text-slate-400 dark:text-slate-500">({linksCount})</span>
              </Link>
              {tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/highlights?tag=${t.id}`}
                  className={itemRowClass(activeTag === String(t.id))}
                >
                  {t.name} <span className="text-xs text-slate-400 dark:text-slate-500">({t.count})</span>
                </Link>
              ))}
              {untaggedCount > 0 && (
                <Link
                  href="/highlights?tag=untagged"
                  className={itemRowClass(activeTag === "untagged")}
                >
                  Untagged <span className="text-xs text-slate-400 dark:text-slate-500">({untaggedCount})</span>
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="px-2">
          <div className="flex items-center gap-1 px-2">
            <Link
              href="/chats"
              className={`flex items-center gap-2 ${sectionRowClass(pathname === "/chats")}`}
            >
              <FontAwesomeIcon icon={faComments} fixedWidth className="text-indigo-400" />
              Chats ({chats.length})
            </Link>
            <button
              onClick={() => setChatsOpen((o) => !o)}
              aria-label="Toggle chats list"
              className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 px-1 shrink-0"
            >
              <FontAwesomeIcon icon={chatsOpen ? faChevronDown : faChevronRight} size="xs" />
            </button>
          </div>
          {chatsOpen && (
            <div className="ml-2 space-y-0.5 mt-1">
              {sortedChats.length === 0 ? (
                <p className="px-2 py-1 text-xs text-slate-400 dark:text-slate-500">No chats yet</p>
              ) : (
                sortedChats.map((c) => (
                  <Link
                    key={c.id}
                    href={`/chats/${c.id}`}
                    className={`flex flex-col pl-2 pr-2 py-1 rounded ${
                      activeChatId === String(c.id)
                        ? "bg-indigo-50 dark:bg-indigo-950"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span
                      title={`${formatChatDate(c.chatDate)} · ${c.messageCount} messages`}
                      className="block text-[10px] leading-tight text-slate-400 dark:text-slate-500 truncate"
                    >
                      {formatChatDate(c.chatDate)} · {c.messageCount} messages
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`min-w-0 flex-1 text-sm truncate ${
                          activeChatId === String(c.id)
                            ? "text-indigo-700 dark:text-indigo-400 font-medium"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {c.title}
                      </span>
                      <FontAwesomeIcon
                        icon={c.reviewed ? faCircleCheck : faCircle}
                        title={c.reviewed ? "Reviewed" : "Not reviewed"}
                        className={`shrink-0 text-sm -translate-y-[1px] ${
                          c.reviewed ? "text-emerald-600" : "text-slate-300 dark:text-slate-600"
                        }`}
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-slate-200 dark:border-slate-700 px-2 py-2 space-y-0.5 shrink-0">
        <Link
          href="/upload"
          className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-sm font-medium ${
            pathname === "/upload"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <FontAwesomeIcon icon={faUpload} fixedWidth className="text-slate-400 dark:text-slate-500" />
          Upload
        </Link>
        <a
          href="/api/backup"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <FontAwesomeIcon icon={faDownload} fixedWidth className="text-slate-400 dark:text-slate-500" />
          Backup
        </a>
        <ThemeToggle />
        <LogoutButton />
      </div>
    </div>
  );
}

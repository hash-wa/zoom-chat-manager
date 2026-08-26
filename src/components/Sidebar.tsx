"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faUpload,
  faComments,
  faBars,
  faChevronDown,
  faChevronRight,
  faDownload,
  faCircleCheck,
  faCircle,
} from "@fortawesome/free-solid-svg-icons";
import type { ChatSummary } from "@/lib/repo";
import { formatChatDate } from "@/lib/formatDate";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

function sectionRowClass(active: boolean) {
  return `flex-1 text-sm font-medium truncate ${
    active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
  }`;
}

export default function Sidebar({ chats }: { chats: ChatSummary[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(true);

  const activeChatId = pathname.match(/^\/chats\/(\d+)/)?.[1];

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
            href="/highlights"
            title="Tagged Messages"
            className={`block text-lg ${pathname === "/highlights" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`}
          >
            <FontAwesomeIcon icon={faStar} fixedWidth />
          </Link>

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
          <Link
            href="/highlights"
            className={`flex items-center gap-2 px-2 ${sectionRowClass(pathname === "/highlights")}`}
          >
            Tagged Messages
          </Link>
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

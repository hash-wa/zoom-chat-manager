"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChatSummary, Tag, LinkMessage } from "@/lib/repo";
import { formatChatDate } from "@/lib/formatDate";
import { highlightText } from "@/lib/linkify";
import TagManager from "@/components/TagManager";
import ChatActionsMenu from "@/components/ChatActionsMenu";
import LinkMessageCard from "@/components/LinkMessageCard";

export default function ChatCard({
  chat,
  allTags,
  messageTags,
  query = "",
  matches = [],
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  chat: ChatSummary;
  allTags: Tag[];
  messageTags?: Tag[];
  query?: string;
  matches?: LinkMessage[];
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
}) {
  const router = useRouter();
  const isSearchResult = query.trim().length > 0;

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

  const header = (
    <div className="min-w-0 flex-1 space-y-0.5">
      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <span>
          {formatChatDate(chat.chatDate)} · {chat.messageCount} messages
        </span>
        {matches.length > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
            {matches.length} match{matches.length === 1 ? "" : "es"}
          </span>
        )}
      </p>
      <div className="flex items-center flex-wrap gap-2">
        {selectMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(chat.id)}
            aria-label={`Select ${chat.title}`}
          />
        )}
        <Link
          href={`/chats/${chat.id}`}
          className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
        >
          {highlightText(chat.title, query)}
        </Link>
        <TagManager
          tags={chat.tags}
          allTags={allTags}
          onAdd={handleAddTag}
          onRemove={handleRemoveTag}
          placeholder="+"
          compact
          inputHoverOnly
        />
      </div>
    </div>
  );

  if (isSearchResult) {
    return (
      <div className="group space-y-2">
        <div className="flex items-start justify-between gap-4">
          {header}
          <ChatActionsMenu chatId={chat.id} chatTitle={chat.title} initialReviewed={chat.reviewed} />
        </div>
        {matches.length > 0 && (
          <div className="space-y-2">
            {matches.map((m) => (
              <LinkMessageCard key={m.id} m={m} query={query} allTags={messageTags} showActions />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-start justify-between gap-4">
      {header}
      <ChatActionsMenu chatId={chat.id} chatTitle={chat.title} initialReviewed={chat.reviewed} />
    </div>
  );
}

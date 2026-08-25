"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChatSummary, Tag } from "@/lib/repo";
import { formatChatDate } from "@/lib/formatDate";
import TagManager from "@/components/TagManager";
import ChatActionsMenu from "@/components/ChatActionsMenu";

export default function ChatCard({ chat, allTags }: { chat: ChatSummary; allTags: Tag[] }) {
  const router = useRouter();

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

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatChatDate(chat.chatDate)} · {chat.messageCount} messages
        </p>
        <div className="flex items-center flex-wrap gap-2">
          <Link
            href={`/chats/${chat.id}`}
            className="font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate"
          >
            {chat.title}
          </Link>
          <TagManager
            tags={chat.tags}
            allTags={allTags}
            onAdd={handleAddTag}
            onRemove={handleRemoveTag}
            placeholder="+"
            compact
          />
        </div>
      </div>
      <ChatActionsMenu chatId={chat.id} chatTitle={chat.title} initialReviewed={chat.reviewed} />
    </div>
  );
}

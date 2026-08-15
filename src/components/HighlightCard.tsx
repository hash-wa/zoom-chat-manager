"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Highlight, Tag } from "@/lib/repo";
import { splitSender } from "@/lib/parseZoomChat";
import { linkify } from "@/lib/linkify";
import { extractReactions } from "@/lib/reactions";
import TagManager from "@/components/TagManager";

export default function HighlightCard({ h, allTags }: { h: Highlight; allTags: Tag[] }) {
  const router = useRouter();
  const { name, to } = splitSender(h.sender);
  const { cleanBody, reactions } = extractReactions(h.body);

  async function handleAddTag(tagName: string) {
    await fetch(`/api/messages/${h.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagName }),
    });
    router.refresh();
  }

  async function handleRemoveTag(tagId: number) {
    await fetch(`/api/messages/${h.id}/tags/${tagId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 hover:border-amber-400 dark:hover:border-amber-600 transition">
      <Link
        href={`/chats/${h.chatId}#message-${h.seq}`}
        className="flex items-baseline gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        <span className="font-medium text-slate-900 dark:text-slate-100">{name}</span>
        {to && <span>to {to}</span>}
        <span>{h.timestampRaw}</span>
        <span className="text-slate-400 dark:text-slate-500">· {h.chatTitle}</span>
      </Link>
      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap mt-0.5 break-words">
        {linkify(cleanBody)}
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
      <div className="mt-2 pt-2 border-t border-amber-100 dark:border-amber-800">
        <TagManager tags={h.tags} allTags={allTags} onAdd={handleAddTag} onRemove={handleRemoveTag} />
      </div>
    </div>
  );
}

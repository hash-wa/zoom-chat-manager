"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TagWithCount } from "@/lib/repo";

function buildHref(tagId: number | undefined, sort: "asc" | "desc") {
  const params = new URLSearchParams();
  if (tagId) params.set("tag", String(tagId));
  if (sort === "asc") params.set("sort", "asc");
  const qs = params.toString();
  return qs ? `/chats?${qs}` : "/chats";
}

function pillClass(active: boolean) {
  return `px-2.5 py-1 rounded-full border ${
    active
      ? "bg-indigo-600 text-white border-indigo-600"
      : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
  }`;
}

export default function ChatTagFilterBar({
  tags,
  activeTagId,
  sort,
}: {
  tags: TagWithCount[];
  activeTagId?: number;
  sort: "asc" | "desc";
}) {
  const router = useRouter();

  async function handleRemove(tagId: number, tagName: string) {
    if (!confirm(`Delete tag "${tagName}"? It will be removed from every chat.`)) return;
    await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
    if (activeTagId === tagId) {
      router.push(buildHref(undefined, sort));
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={buildHref(undefined, sort)} className={pillClass(!activeTagId)}>
          All
        </Link>
        {tags.map((t) => (
          <div
            key={t.id}
            className={`${pillClass(activeTagId === t.id)} inline-flex items-center gap-1 pr-1.5`}
          >
            <Link href={buildHref(t.id, sort)} className="hover:underline">
              {t.name} <span className="opacity-60">({t.count})</span>
            </Link>
            <button
              onClick={() => handleRemove(t.id, t.name)}
              aria-label={`Delete tag ${t.name}`}
              className="opacity-60 hover:opacity-100 leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 text-sm">
        <Link
          href={buildHref(activeTagId, "desc")}
          className={pillClass(sort === "desc")}
        >
          Newest first
        </Link>
        <Link href={buildHref(activeTagId, "asc")} className={pillClass(sort === "asc")}>
          Oldest first
        </Link>
      </div>
    </div>
  );
}

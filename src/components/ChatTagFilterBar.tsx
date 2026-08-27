"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TagWithCount } from "@/lib/repo";

type Query = { sort: "asc" | "desc"; q?: string; from?: string; to?: string; checked?: "1" | "0" | null };

function buildHref(tagId: number | undefined, query: Query) {
  const params = new URLSearchParams();
  if (tagId) params.set("tag", String(tagId));
  if (query.sort === "asc") params.set("sort", "asc");
  if (query.q) params.set("q", query.q);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.checked) params.set("checked", query.checked);
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
  q,
  from,
  to,
  checked,
}: {
  tags: TagWithCount[];
  activeTagId?: number;
  sort: "asc" | "desc";
  q?: string;
  from?: string;
  to?: string;
  checked?: "1" | "0" | null;
}) {
  const router = useRouter();
  const query: Query = { sort, q, from, to, checked };

  async function handleRemove(tagId: number, tagName: string) {
    if (!confirm(`Delete tag "${tagName}"? It will be removed from every chat.`)) return;
    await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
    if (activeTagId === tagId) {
      router.push(buildHref(undefined, query));
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <Link href={buildHref(undefined, query)} className={pillClass(!activeTagId)}>
        All
      </Link>
      {tags.map((t) => (
        <div
          key={t.id}
          className={`${pillClass(activeTagId === t.id)} inline-flex items-center gap-1 pr-1.5`}
        >
          <Link href={buildHref(t.id, query)} className="hover:underline">
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
  );
}

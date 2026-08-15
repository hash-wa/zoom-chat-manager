"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import type { Tag } from "@/lib/repo";

export default function HighlightTagHeader({
  tag,
  large = false,
  linkToFilter = true,
}: {
  tag: Tag;
  large?: boolean;
  linkToFilter?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(tag.name);
  const [busy, setBusy] = useState(false);

  const textClass = large
    ? "text-lg font-semibold text-slate-900 dark:text-slate-100"
    : "text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide";

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === tag.name) {
      setValue(tag.name);
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Rename failed");
        setValue(tag.name);
      }
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete tag "${tag.name}"? It will be removed from every message.`)) return;
    await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
    router.push("/highlights");
    router.refresh();
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            setValue(tag.name);
            setEditing(false);
          }
        }}
        className={`${textClass} border-b border-indigo-400 focus:outline-none bg-transparent`}
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-2 group">
      {linkToFilter ? (
        <Link href={`/highlights?tag=${tag.id}`} className={`${textClass} hover:text-indigo-600 dark:hover:text-indigo-400`}>
          {tag.name}
        </Link>
      ) : (
        <span className={textClass}>{tag.name}</span>
      )}
      <button
        onClick={() => setEditing(true)}
        aria-label="Rename tag"
        className="opacity-0 group-hover:opacity-100 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
      >
        <FontAwesomeIcon icon={faPen} size="xs" />
      </button>
      <button
        onClick={handleDelete}
        aria-label="Delete tag"
        className="opacity-0 group-hover:opacity-100 text-slate-400 dark:text-slate-500 hover:text-red-600"
      >
        <FontAwesomeIcon icon={faTrashCan} size="xs" />
      </button>
    </span>
  );
}

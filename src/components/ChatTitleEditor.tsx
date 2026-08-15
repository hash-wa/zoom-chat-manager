"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChatTitleEditor({
  chatId,
  title,
}: {
  chatId: number;
  title: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) {
      setValue(title);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            setValue(title);
            setEditing(false);
          }
        }}
        className="text-lg font-semibold text-slate-900 dark:text-slate-100 border-b border-indigo-400 focus:outline-none bg-transparent w-full max-w-md"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-baseline gap-2 text-left"
      title="Click to rename"
    >
      <span className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 dark:hover:text-indigo-400">
        {title}
      </span>
      <span className="text-xs text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100">rename</span>
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChatNotes({
  chatId,
  initialNotes,
}: {
  chatId: number;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saved || saving) return;
    setSaving(true);
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes</label>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {saving ? "Saving..." : saved ? "" : "Unsaved changes"}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        onBlur={save}
        rows={3}
        placeholder="Notes about this chat..."
        className="w-full text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

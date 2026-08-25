"use client";

import { useMemo, useState } from "react";
import type { Tag } from "@/lib/repo";
import TagChip from "@/components/TagChip";

export default function TagManager({
  tags,
  allTags,
  onAdd,
  onRemove,
  placeholder = "Add tag...",
  compact = false,
}: {
  tags: Tag[];
  allTags: Tag[];
  onAdd: (name: string) => Promise<void>;
  onRemove: (tagId: number) => Promise<void>;
  placeholder?: string;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    const applied = new Set(tags.map((t) => t.name.toLowerCase()));
    return allTags
      .filter((t) => !applied.has(t.name.toLowerCase()) && t.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [value, allTags, tags]);

  async function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onAdd(trimmed);
      setValue("");
      setShowSuggestions(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <TagChip key={tag.id} tag={tag} onRemove={() => onRemove(tag.id)} />
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTag(value);
        }}
        className="relative flex items-center gap-1"
      >
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowSuggestions(false);
            if (e.key === "Tab" && value.trim()) {
              e.preventDefault();
              addTag(value);
            }
          }}
          placeholder={placeholder}
          className={`text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-full px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
            compact ? "w-7 focus:w-28" : "w-24 focus:w-32"
          }`}
        />
        {value.trim() && (
          <button
            type="submit"
            disabled={busy}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50"
          >
            Add
          </button>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50">
            {suggestions.map((t) => (
              <button
                key={t.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(t.name)}
                className="block w-full text-left px-3 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-700 dark:hover:text-indigo-400 truncate"
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

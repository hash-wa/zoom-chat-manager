"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Message } from "@/lib/repo";
import { extractReactions } from "@/lib/reactions";

// Short greetings, acknowledgments, thanks, laughter, farewells - the kind
// of low-content chatter that's rarely worth keeping around.
const FILLER_PHRASES = new Set([
  "hi", "hello", "hey", "hiya", "yo",
  "good morning", "morning", "good afternoon", "afternoon", "good evening", "evening",
  "bye", "goodbye", "see ya", "cya", "later", "gtg", "take care", "have a good one",
  "ok", "okay", "k", "kk", "cool", "nice", "great", "awesome", "perfect", "sounds good",
  "thanks", "thank you", "thx", "ty", "np", "no problem", "you're welcome",
  "yes", "yep", "yeah", "yup", "no", "nope", "nah",
  "lol", "lmao", "haha", "hahaha", "rofl", "lolol",
  "+1", "same", "me too", "agreed", "agree", "this", "this!",
  "got it", "will do", "on it", "noted",
]);

const EMOJI_ONLY = /^[\p{Extended_Pictographic}️‍\s]+$/u;

function isLowValue(cleanBody: string): boolean {
  const trimmed = cleanBody.trim();
  if (!trimmed) return false;
  if (EMOJI_ONLY.test(trimmed)) return true;
  const normalized = trimmed.toLowerCase().replace(/[.!?,]+$/g, "");
  if (FILLER_PHRASES.has(normalized)) return true;
  if (normalized.length <= 3 && !/https?:\/\//.test(normalized)) return true;
  return false;
}

function flatten(messages: Message[]): Message[] {
  const result: Message[] = [];
  const walk = (msgs: Message[]) => {
    for (const m of msgs) {
      result.push(m);
      walk(m.replies);
    }
  };
  walk(messages);
  return result;
}

function findLowValueMessages(messages: Message[]): Message[] {
  return flatten(messages)
    .filter((m) => isLowValue(extractReactions(m.body).cleanBody))
    .sort((a, b) => a.seq - b.seq);
}

export default function LowValueReviewPanel({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number> | null>(null);
  const [deleting, setDeleting] = useState(false);

  const candidates = useMemo(() => findLowValueMessages(messages), [messages]);
  const activeSelected = selected ?? new Set(candidates.map((m) => m.id));

  if (candidates.length === 0) return null;

  function toggle(id: number) {
    const next = new Set(activeSelected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleDelete() {
    const ids = [...activeSelected];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Delete ${ids.length} message${ids.length === 1 ? "" : "s"}? Any replies they have will move out of their thread instead of being deleted.`
      )
    )
      return;
    setDeleting(true);
    try {
      await Promise.all(ids.map((id) => fetch(`/api/messages/${id}`, { method: "DELETE" })));
      setSelected(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-600"
      >
        {open ? "Hide" : "Review"} {candidates.length} low-value message
        {candidates.length === 1 ? "" : "s"}
      </button>
      {open && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <span>Short greetings, thanks, reactions typed as text, etc. Uncheck any you want to keep.</span>
            <button
              onClick={handleDelete}
              disabled={deleting || activeSelected.size === 0}
              className="text-red-600 hover:text-red-800 disabled:opacity-50 shrink-0"
            >
              {deleting ? "Deleting..." : `Delete ${activeSelected.size} selected`}
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {candidates.map((m) => {
              const { cleanBody } = extractReactions(m.body);
              return (
                <label
                  key={m.id}
                  className="flex items-start gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={activeSelected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{m.sender}</span>
                    <span className="text-slate-400 dark:text-slate-500 text-xs ml-2">{m.timestampRaw}</span>
                    <span className="block text-slate-600 dark:text-slate-400 truncate">{cleanBody}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

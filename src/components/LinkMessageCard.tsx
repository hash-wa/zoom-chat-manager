"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LinkMessage } from "@/lib/repo";
import { splitSender } from "@/lib/parseZoomChat";
import { linkifyWithHighlight, highlightText } from "@/lib/linkify";
import { extractReactions } from "@/lib/reactions";

export default function LinkMessageCard({
  m,
  query = "",
  showConnected = false,
}: {
  m: LinkMessage;
  query?: string;
  showConnected?: boolean;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(m.connected);
  const [busy, setBusy] = useState(false);
  const { name, to } = splitSender(m.sender);
  const { cleanBody, reactions } = extractReactions(m.body);

  async function toggleConnected() {
    if (busy) return;
    setBusy(true);
    const next = !connected;
    setConnected(next);
    try {
      await fetch(`/api/messages/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connected: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 transition ${
        connected ? "border-emerald-300" : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700"
      }`}
    >
      <Link
        href={`/chats/${m.chatId}#message-${m.seq}`}
        className="flex items-baseline gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        <span className="font-medium text-slate-900 dark:text-slate-100">{highlightText(name, query)}</span>
        {to && <span>to {to}</span>}
        <span>{m.timestampRaw}</span>
        <span className="text-slate-400 dark:text-slate-500">· {m.chatTitle}</span>
      </Link>
      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap mt-0.5 break-words">
        {linkifyWithHighlight(cleanBody, query)}
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
      {showConnected && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={connected}
              onChange={toggleConnected}
              disabled={busy}
            />
            <span className={connected ? "text-emerald-600 font-medium" : "text-slate-500 dark:text-slate-400"}>
              {connected ? "Connected" : "Mark as connected"}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

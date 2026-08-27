"use client";

import { useEffect, useState } from "react";
import type { LinkMessage, Tag } from "@/lib/repo";
import LinkMessageCard from "@/components/LinkMessageCard";

type DisplayItem = LinkMessage & { showConnected: boolean };

export default function HighlightsResultsList({
  results,
  allTags,
}: {
  results: DisplayItem[];
  allTags: Tag[];
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (results.length === 0) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Escape") {
        setFocusedIndex(-1);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [results.length]);

  return (
    <div className="space-y-2">
      {results.map((m, i) => (
        <LinkMessageCard
          key={m.id}
          m={m}
          showConnected={m.showConnected}
          allTags={allTags}
          showActions
          focused={i === focusedIndex}
        />
      ))}
    </div>
  );
}

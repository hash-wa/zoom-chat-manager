import React from "react";
import { URL_REGEX } from "@/lib/links";

const TRAILING_PUNCTUATION = /[),.!?;:'"]+$/;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Segment = { type: "text"; value: string } | { type: "link"; url: string; trailing: string };

// Splits on URLs first so highlighting (which runs only over "text"
// segments) can never land inside a URL and break its href.
function segmentUrls(text: string): Segment[] {
  return text.split(URL_REGEX).map((part, i): Segment => {
    if (i % 2 === 0) return { type: "text", value: part };
    const trailingMatch = part.match(TRAILING_PUNCTUATION);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const url = trailing ? part.slice(0, -trailing.length) : part;
    return url ? { type: "link", url, trailing } : { type: "text", value: part };
  });
}

function renderLink(url: string, trailing: string, key: number): React.ReactNode {
  return (
    <React.Fragment key={key}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300 break-words"
      >
        {url}
      </a>
      {trailing}
    </React.Fragment>
  );
}

export function linkify(text: string): React.ReactNode[] {
  return segmentUrls(text).map((seg, i) =>
    seg.type === "link" ? renderLink(seg.url, seg.trailing, i) : seg.value
  );
}

// Same as linkify(), but also wraps case-insensitive matches of `query` in
// <mark> - only within plain text, never inside a URL, so a search term
// that happens to overlap a link can't split its href.
export function linkifyWithHighlight(text: string, query: string): React.ReactNode[] {
  if (!query.trim()) return linkify(text);
  return segmentUrls(text).map((seg, i) =>
    seg.type === "link" ? (
      renderLink(seg.url, seg.trailing, i)
    ) : (
      <React.Fragment key={i}>{highlightText(seg.value, query)}</React.Fragment>
    )
  );
}

export function highlightText(text: string, query: string): React.ReactNode[] {
  if (!query.trim()) return [text];
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "ig"));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-600/60 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

"use client";

import type { ReactNode } from "react";
import type { Message, Tag } from "@/lib/repo";
import MessageBubble from "@/components/MessageBubble";

export default function ChatMessageList({
  messages,
  hasMessages,
  emptyMessage,
  allTags,
  query,
  selectMode,
  selected,
  onToggleSelect,
  focusedIndex,
}: {
  messages: Message[];
  hasMessages: boolean;
  emptyMessage: ReactNode;
  allTags: Tag[];
  query: string;
  selectMode: boolean;
  selected: Set<number>;
  onToggleSelect: (id: number) => void;
  focusedIndex: number;
}) {
  return (
    <div className="space-y-2 pt-2">
      {!hasMessages ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No messages could be parsed from this chat.</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      ) : (
        messages.map((message, i) => (
          <MessageBubble
            key={message.id}
            message={message}
            allTags={allTags}
            query={query}
            selectMode={selectMode}
            selected={selected}
            onToggleSelect={onToggleSelect}
            focused={i === focusedIndex}
          />
        ))
      )}
    </div>
  );
}

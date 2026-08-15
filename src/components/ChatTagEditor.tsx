"use client";

import { useRouter } from "next/navigation";
import type { Tag } from "@/lib/repo";
import TagManager from "@/components/TagManager";

export default function ChatTagEditor({
  chatId,
  tags,
  allTags,
}: {
  chatId: number;
  tags: Tag[];
  allTags: Tag[];
}) {
  const router = useRouter();

  async function handleAdd(name: string) {
    await fetch(`/api/chats/${chatId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagName: name }),
    });
    router.refresh();
  }

  async function handleRemove(tagId: number) {
    await fetch(`/api/chats/${chatId}/tags/${tagId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <TagManager tags={tags} allTags={allTags} onAdd={handleAdd} onRemove={handleRemove} />
  );
}

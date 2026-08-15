"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";

export default function DeleteChatButton({
  chatId,
  chatTitle,
}: {
  chatId: number;
  chatTitle: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${chatTitle}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      router.push("/chats");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 shrink-0"
    >
      <FontAwesomeIcon icon={faTrashCan} />
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}

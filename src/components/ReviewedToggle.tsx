"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircle } from "@fortawesome/free-solid-svg-icons";

export default function ReviewedToggle({
  chatId,
  initialReviewed,
}: {
  chatId: number;
  initialReviewed: boolean;
}) {
  const router = useRouter();
  const [reviewed, setReviewed] = useState(initialReviewed);
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    if (busy) return;
    setBusy(true);
    const next = !reviewed;
    setReviewed(next);
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className={`flex items-center gap-1.5 text-sm disabled:opacity-50 ${
        reviewed ? "text-emerald-600 hover:text-emerald-800" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
      }`}
    >
      <FontAwesomeIcon icon={reviewed ? faCircleCheck : faCircle} />
      {reviewed ? "Reviewed" : "Mark reviewed"}
    </button>
  );
}

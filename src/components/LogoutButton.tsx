"use client";

import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

export default function LogoutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (iconOnly) {
    return (
      <button
        onClick={handleLogout}
        title="Log out"
        aria-label="Log out"
        className="text-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
      >
        <FontAwesomeIcon icon={faRightFromBracket} fixedWidth />
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2.5 px-2 py-1.5 rounded text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 w-full text-left"
    >
      <FontAwesomeIcon icon={faRightFromBracket} fixedWidth className="text-slate-400 dark:text-slate-500" />
      Log out
    </button>
  );
}

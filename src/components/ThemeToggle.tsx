"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";

export default function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  if (iconOnly) {
    return (
      <button
        onClick={toggle}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Toggle dark mode"
        className="text-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
      >
        <FontAwesomeIcon icon={dark ? faSun : faMoon} fixedWidth />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2.5 px-2 py-1.5 rounded text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 w-full text-left"
    >
      <FontAwesomeIcon icon={dark ? faSun : faMoon} fixedWidth className="text-slate-400 dark:text-slate-500" />
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}

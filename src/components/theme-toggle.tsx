"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function detectTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => detectTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    window.localStorage.setItem("theme", next);
  }

  return (
    <button type="button" className="secondary" onClick={toggleTheme}>
      {theme === "light" ? "Темная тема" : "Светлая тема"}
    </button>
  );
}

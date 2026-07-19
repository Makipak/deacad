"use client";

import { useSyncExternalStore } from "react";

// Status dark mode dibaca sebagai external store dari class <html> (di-set inline script di
// layout.tsx sebelum hydration) — MutationObserver menjaga state React tetap sinkron tanpa
// setState-di-effect, dan snapshot server selalu light (aman untuk SSR).
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("deacad-theme", next ? "dark" : "light");
    } catch {
      // localStorage bisa gagal di private mode — tema tetap berubah untuk sesi ini.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      className="flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-line bg-surface px-3.5 text-[14px] text-muted transition-colors hover:text-fg"
    >
      <span aria-hidden className="text-[15px] leading-none">
        {dark ? "☾" : "☀"}
      </span>
      <span className="hidden lg:inline">{dark ? "Mode Gelap" : "Mode Terang"}</span>
    </button>
  );
}

"use client";

import { THEME_STORAGE_KEY, THEMES, type ThemeName } from "@/lib/themes";

function choose(name: ThemeName) {
  window.localStorage.setItem(THEME_STORAGE_KEY, name);
  document.documentElement.setAttribute("data-theme", name);
}

export function ThemeSwitcher() {
  return (
    <div className="flex items-center gap-1.5 shrink-0 pl-1">
      {THEMES.map((t) => (
        <button
          key={t.name}
          data-theme-swatch={t.name}
          onClick={() => choose(t.name)}
          title={t.label}
          aria-label={`${t.label} theme`}
          className="w-5 h-5 rounded-full theme-swatch-btn"
          style={{ background: t.swatch }}
        />
      ))}
    </div>
  );
}

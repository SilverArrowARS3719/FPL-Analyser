"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GLASS_PILL } from "@/lib/ui";
import { ThemeSwitcher } from "./ThemeSwitcher";

const LINKS = [
  { href: "/team", label: "My Team" },
  { href: "/transformation", label: "Transformation" },
  { href: "/stats", label: "Stats" },
  { href: "/live", label: "Live" },
  { href: "/chips", label: "Chips" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="fixed top-4 inset-x-0 z-50 px-4">
      <div
        className={`max-w-5xl mx-auto rounded-full ${GLASS_PILL} px-3 py-2 flex items-center gap-2 flex-nowrap`}
      >
        <Link
          href="/team"
          className="flex items-center gap-2 pl-1 pr-2 font-semibold tracking-tight text-[#251f38] shrink-0"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-from)] to-[var(--accent-to)] text-white text-[10px] font-bold shadow-[0_6px_16px_-4px_rgba(var(--accent-rgb),0.6)] shrink-0">
            FPL
          </span>
          <span className="hidden sm:inline text-[15px] whitespace-nowrap">Analyser</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto flex-1 min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-[#251f38] text-white shadow-[0_8px_20px_-8px_rgba(37,31,56,0.6)]"
                    : "text-[#251f38]/70 hover:bg-white/60 hover:text-[#251f38]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <ThemeSwitcher />
      </div>
    </header>
  );
}

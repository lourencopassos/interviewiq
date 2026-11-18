"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, History, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/new", label: "Practice", icon: Plus },
  { href: "/history", label: "History", icon: History },
];

/**
 * Top bar in the reference's voice: a logo tile, pill tabs, utilities on the right.
 * Hidden on the interview screen, which has its own header.
 */
export function SiteNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/interview/")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md print:hidden">
      <div className="container flex h-14 items-center gap-4">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="InterviewIQ home">
          <span className="tile-pop tile-pop-hover flex h-8 w-8 items-center justify-center rounded-md bg-peach text-peach-deep shadow-pop-sm">
            <Mic className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-extrabold tracking-tight">
            Interview<span className="rounded-[4px] bg-sage px-1 text-sage-deep">IQ</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:flex" aria-label="Primary">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname?.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md border-1.5 px-3 text-xs font-semibold transition-[transform,box-shadow,background-color] duration-150 ease-pop",
                  active
                    ? "border-ink bg-sage text-sage-deep shadow-pop-sm"
                    : "border-transparent text-ink-2 hover:border-ink hover:bg-card hover:shadow-pop-sm",
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:inline-flex">
            <span className="led bg-sage-deep text-sage-deep/40" aria-hidden />
            Local · BYO keys
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/track", label: "Track Order" },
  { href: "/contact", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href.split("#")[0] && !href.includes("#");

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto max-w-6xl rounded-[28px] border border-white/60 bg-white/95 shadow-[0_10px_35px_-18px_rgba(11,27,51,0.35)] backdrop-blur">
        <div className="flex h-16 items-center justify-between pl-5 pr-3 sm:pl-7 sm:pr-3.5">
          <Logo />

          <nav className="hidden items-center gap-0.5 lg:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "relative rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                  isCurrent(l.href)
                    ? "text-accent-600 after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-accent-600"
                    : "text-ink-600 hover:text-ink-900",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-1 lg:flex">
            <Link
              href="/book"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
            >
              Book a Pickup <ArrowRight size={15} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-full text-ink-700 hover:bg-ink-100 lg:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <nav className="border-t border-ink-100 px-4 py-3 lg:hidden">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-3 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-50"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-accent-600 px-3 py-3 text-center text-sm font-semibold text-white"
            >
              Book a Pickup <ArrowRight size={15} />
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

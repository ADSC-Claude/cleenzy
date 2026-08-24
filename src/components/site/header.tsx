"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/services", label: "Services & Pricing" },
  { href: "/book", label: "Book" },
  { href: "/track", label: "Track Order" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === l.href
                  ? "text-accent-700"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="ml-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:text-ink-900"
          >
            Log in
          </Link>
          <Link
            href="/book"
            className="ml-1 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-700"
          >
            Book Now
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="grid h-10 w-10 place-items-center rounded-lg text-ink-700 hover:bg-ink-100 md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-ink-200 bg-white px-4 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-3 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            Log in
          </Link>
          <Link
            href="/book"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-lg bg-accent-600 px-3 py-3 text-center text-sm font-medium text-white"
          >
            Book Now
          </Link>
        </nav>
      )}
    </header>
  );
}

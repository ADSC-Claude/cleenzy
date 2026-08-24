"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ClipboardList, WashingMachine, Truck, Bike,
  Tags, Wallet, Users, BarChart3, UserCog, Settings, Menu, X, LogOut,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/auth-actions";
import type { UserRole } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/roles";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/queue", label: "Laundry Queue", icon: WashingMachine },
  { href: "/admin/logistics", label: "Pickup & Delivery", icon: Truck },
  { href: "/admin/rider", label: "My Runs", icon: Bike },
  { href: "/admin/services", label: "Services & Pricing", icon: Tags },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/staff", label: "Staff", icon: UserCog },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({
  role, name, allowed, children,
}: {
  role: UserRole; name: string; allowed: string[]; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // The nav only lists what this role can actually open, so staff never see a
  // link that would bounce them straight back.
  const links = NAV.filter((l) => allowed.includes(l.href));

  const isCurrent = (l: (typeof NAV)[number]) =>
    l.exact ? pathname === l.href : pathname.startsWith(l.href);

  return (
    <div className="min-h-screen bg-ink-50 print:min-h-0 print:bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white print:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-700 hover:bg-ink-100 lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link href="/admin" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-600 text-xs font-bold text-white">
              C
            </span>
            <span className="font-semibold tracking-tight text-ink-900">
              Cleenzy <span className="font-normal text-ink-400">Admin</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-ink-900">{name}</p>
              <p className="text-xs text-ink-500">{ROLE_LABEL[role]}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-600 hover:bg-ink-100"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-14 left-0 z-30 w-64 overflow-y-auto border-r border-ink-200 bg-white p-3 print:hidden",
            "transition-transform lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
            "lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0",
          )}
        >
          <nav className="space-y-0.5">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={isCurrent(l) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isCurrent(l)
                    ? "bg-accent-50 text-accent-800"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                )}
              >
                <l.icon size={17} className="shrink-0" />
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 border-t border-ink-200 pt-4">
            <Link
              href="/"
              className="block rounded-lg px-3 py-2 text-sm text-ink-500 hover:bg-ink-50 hover:text-ink-800"
            >
              View customer site →
            </Link>
          </div>
        </aside>

        {open && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-14 z-20 bg-ink-900/20 lg:hidden"
          />
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}

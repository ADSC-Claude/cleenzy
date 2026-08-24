import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg bg-accent-600 text-sm font-bold text-white"
      >
        C
      </span>
      <span className="text-lg font-semibold tracking-tight text-ink-900">
        Cleenzy
      </span>
    </Link>
  );
}

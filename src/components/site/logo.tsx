import Link from "next/link";
import { cn } from "@/lib/cn";

/** Four-point sparkle from the wordmark. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden
         className={cn("inline-block", className)}>
      <path d="M10 0c.6 5.4 4.6 9.4 10 10-5.4.6-9.4 4.6-10 10-.6-5.4-4.6-9.4-10-10C5.4 9.4 9.4 5.4 10 0z" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex flex-col leading-none", className)}>
      <span className="flex items-start gap-0.5">
        <span className="text-[26px] font-extrabold italic tracking-tight text-ink-900">
          cleenzy
        </span>
        <Sparkle className="mt-0.5 h-3 w-3 text-accent-600 transition-transform group-hover:rotate-45" />
      </span>
      <span className="mt-0.5 pl-0.5 text-[8px] font-bold uppercase tracking-[0.28em] text-ink-400">
        Laundry Service
      </span>
    </Link>
  );
}

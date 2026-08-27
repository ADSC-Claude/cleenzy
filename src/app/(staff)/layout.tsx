import Link from "next/link";
import { Logo } from "@/components/site/logo";

/**
 * Sign-in and account creation sit outside the (site) group on purpose: the
 * website visibility switch must never be able to lock staff out of their own
 * back office. Same URLs, minimal chrome, no links into the public pages.
 */
export default function StaffLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-4 py-6 sm:px-8">
        <Logo />
      </header>
      <main className="flex-1">{children}</main>
      <footer className="px-4 py-8 text-center text-xs text-ink-400 sm:px-8">
        <Link href="/" className="hover:text-accent-600">Back to the website</Link>
      </footer>
    </div>
  );
}

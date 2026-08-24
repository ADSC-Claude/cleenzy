import Link from "next/link";
import { Logo } from "./logo";
import type { BusinessSettings } from "@/lib/data";

export function SiteFooter({ business }: { business: BusinessSettings }) {
  return (
    <footer className="mt-20 border-t border-ink-200 bg-ink-50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-600">{business.tagline}</p>
          <p className="mt-4 text-sm text-ink-600">{business.address}</p>
          <p className="text-sm text-ink-600">{business.hours}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink-900">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li><Link href="/services" className="hover:text-accent-700">Services & Pricing</Link></li>
            <li><Link href="/book" className="hover:text-accent-700">Book a Laundry</Link></li>
            <li><Link href="/track" className="hover:text-accent-700">Track an Order</Link></li>
            <li><Link href="/contact" className="hover:text-accent-700">Contact & FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink-900">Get in touch</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li><a href={`tel:${business.phone.replace(/\s/g, "")}`} className="hover:text-accent-700">{business.phone}</a></li>
            <li><a href={`mailto:${business.email}`} className="hover:text-accent-700">{business.email}</a></li>
            <li><Link href="/login" className="hover:text-accent-700">Staff login</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-200 px-4 py-5 text-center text-xs text-ink-500 sm:px-6">
        © {new Date().getFullYear()} {business.name}. All rights reserved.
      </div>
    </footer>
  );
}

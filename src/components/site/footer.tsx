import Link from "next/link";
import { Heart } from "lucide-react";
import { Logo } from "./logo";
import type { BusinessSettings } from "@/lib/data";

export function SiteFooter({ business }: { business: BusinessSettings }) {
  return (
    <footer className="mt-20 px-3 pb-4 sm:px-5">
      <div className="mx-auto max-w-6xl rounded-[2rem] bg-white shadow-[0_14px_35px_-24px_rgba(11,27,51,0.35)]">
        <div className="grid gap-8 px-7 py-11 sm:px-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-600">
              We pick up, clean, and deliver your laundry fresh and on time.{" "}
              <Heart size={13} className="inline -mt-0.5 text-accent-500" strokeWidth={2.5} />
            </p>
            <p className="mt-4 text-sm text-ink-500">{business.address}</p>
            <p className="text-sm text-ink-500">{business.hours}</p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-ink-900">Company</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-600">
              <li><Link href="/services" className="hover:text-accent-600">Services &amp; Pricing</Link></li>
              <li><Link href="/book" className="hover:text-accent-600">Book a Pickup</Link></li>
              <li><Link href="/track" className="hover:text-accent-600">Track an Order</Link></li>
              <li><Link href="/contact" className="hover:text-accent-600">Contact &amp; FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-ink-900">Get in touch</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-600">
              <li><a href={`tel:${business.phone.replace(/\s/g, "")}`} className="hover:text-accent-600">{business.phone}</a></li>
              <li><a href={`mailto:${business.email}`} className="hover:text-accent-600">{business.email}</a></li>
              <li><Link href="/login" className="hover:text-accent-600">Staff login</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-ink-100 px-7 py-5 text-center text-xs text-ink-400 sm:px-10">
          © {new Date().getFullYear()} {business.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

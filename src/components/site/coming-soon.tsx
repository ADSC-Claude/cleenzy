import { Mail, Phone } from "lucide-react";
import { Sparkle } from "./logo";
import type { BusinessSettings, SiteSettings } from "@/lib/data";

/**
 * Stands in for the whole customer site while Settings → Website visibility is
 * set to "coming soon". Deliberately self-contained: no header, no footer and
 * no links into pages the owner has chosen not to show yet.
 */
export function ComingSoon({
  site, business,
}: { site: SiteSettings; business: BusinessSettings }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-full max-w-lg rounded-[2rem] bg-white px-7 py-12 shadow-[0_14px_35px_-24px_rgba(11,27,51,0.35)] sm:px-12">
        <span className="inline-flex items-start gap-0.5">
          <span className="text-[34px] font-extrabold italic tracking-tight text-ink-900">
            cleenzy
          </span>
          <Sparkle className="mt-1 h-4 w-4 text-accent-600" />
        </span>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.28em] text-ink-400">
          Laundry Service
        </p>

        <h1 className="mt-9 text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl">
          {site.headline}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-ink-600">
          {site.message}
        </p>

        <p className="font-hand mt-9 text-2xl text-accent-600">
          Less laundry. More you.
        </p>

        <div className="mt-9 border-t border-ink-100 pt-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Questions in the meantime
          </p>
          <div className="mt-3 flex flex-col items-center gap-2 text-sm text-ink-700">
            <a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`}
               className="inline-flex items-center gap-2 hover:text-accent-600">
              <Phone size={14} className="text-accent-500" />
              {business.phone}
            </a>
            <a href={`mailto:${business.email}`}
               className="inline-flex items-center gap-2 hover:text-accent-600">
              <Mail size={14} className="text-accent-500" />
              {business.email}
            </a>
          </div>
        </div>
      </div>

      <p className="mt-8 text-xs text-ink-400">
        &copy; {new Date().getFullYear()} {business.name}
      </p>
    </main>
  );
}

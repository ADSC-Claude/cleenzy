import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, PhoneCall, Clock, ChevronRight } from "lucide-react";
import { getBusiness, getPaymentSettings } from "@/lib/data";
import { FAQS } from "@/lib/faq";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact & FAQ",
  description: "Talk to Cleenzy about pickups, pricing, turnaround and payments.",
};

export default async function ContactPage() {
  const [business, payments] = await Promise.all([
    getBusiness(), getPaymentSettings(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <PageHeader
        title="Contact & FAQ"
        description="Anything we have not answered below, just call or message us."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <PhoneCall size={20} className="text-accent-600" />
          <h2 className="mt-3 font-semibold text-ink-900">Call or text</h2>
          <a
            href={`tel:${business.phone.replace(/\s/g, "")}`}
            className="mt-1 block text-sm text-accent-700 hover:text-accent-800"
          >
            {business.phone}
          </a>
          <p className="mt-1 text-xs text-ink-500">Viber available on the same number.</p>
        </Card>

        <Card>
          <Mail size={20} className="text-accent-600" />
          <h2 className="mt-3 font-semibold text-ink-900">Email</h2>
          <a
            href={`mailto:${business.email}`}
            className="mt-1 block text-sm text-accent-700 hover:text-accent-800"
          >
            {business.email}
          </a>
          <p className="mt-1 text-xs text-ink-500">We reply within a few hours.</p>
        </Card>

        <Card>
          <MapPin size={20} className="text-accent-600" />
          <h2 className="mt-3 font-semibold text-ink-900">Drop off at the shop</h2>
          <p className="mt-1 text-sm text-ink-600">{business.address}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
            <Clock size={13} /> {business.hours}
          </p>
        </Card>
      </div>

      <Card className="mt-5 bg-accent-50">
        <h2 className="font-semibold text-ink-900">Payment details</h2>
        <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium text-ink-800">GCash</p>
            <p className="text-ink-600">{payments.gcash_name}</p>
            <p className="font-mono text-ink-900">{payments.gcash_number}</p>
          </div>
          <div>
            <p className="font-medium text-ink-800">Bank transfer</p>
            <p className="text-ink-600">
              {payments.bank_name} · {payments.bank_account_name}
            </p>
            <p className="font-mono text-ink-900">{payments.bank_account_number}</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-600">
          Always send your order number as the payment reference so we can match
          it to your laundry.
        </p>
      </Card>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">
          Frequently asked questions
        </h2>
        <div className="mt-5 divide-y divide-ink-200 border-y border-ink-200">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink-900">
                {f.q}
                <ChevronRight
                  size={18}
                  className="shrink-0 text-ink-400 transition-transform group-open:rotate-90"
                />
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/book"
          className="rounded-lg bg-accent-600 px-5 py-3 text-sm font-medium text-white hover:bg-accent-700"
        >
          Book a laundry service
        </Link>
        <Link
          href="/track"
          className="rounded-lg border border-ink-200 bg-white px-5 py-3 text-sm font-medium text-ink-800 hover:bg-ink-50"
        >
          Track an order
        </Link>
      </div>
    </div>
  );
}

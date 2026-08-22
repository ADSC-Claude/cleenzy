import Link from "next/link";
import {
  Truck, Clock, ShieldCheck, Wallet, PhoneCall,
  CalendarCheck, Package, Sparkles, MapPin, ChevronRight,
} from "lucide-react";
import { getServices, getServiceAreas, getBusiness } from "@/lib/data";
import { peso } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/status";
import { FAQS } from "@/lib/faq";
import { Button, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const STEPS = [
  { icon: CalendarCheck, title: "Book online", body: "Pick your service, tell us roughly how much laundry you have, and choose a pickup window." },
  { icon: Truck, title: "We pick up", body: "Our rider collects your bag at your door and brings it to the shop." },
  { icon: Sparkles, title: "We clean it", body: "Sorted, washed, dried and folded — your laundry is never mixed with anyone else's." },
  { icon: Package, title: "We deliver", body: "Fresh laundry back at your door on the schedule you picked. Pay on delivery or online." },
];

const REASONS = [
  { icon: Clock, title: "Next-day turnaround", body: "Wash & fold booked today is back tomorrow. Every service shows its turnaround up front." },
  { icon: Wallet, title: "Pay the weighed price", body: "We weigh your laundry on arrival and charge the real weight — no padded estimates." },
  { icon: ShieldCheck, title: "Never mixed", body: "Each order is tagged and washed separately, then counted again at packing." },
  { icon: PhoneCall, title: "You always know where it is", body: "Track your order live, and get a message at pickup, when it is ready, and on the way back." },
];

export default async function HomePage() {
  const [services, areas, business] = await Promise.all([
    getServices(), getServiceAreas(), getBusiness(),
  ]);

  const preview = services.slice(0, 4);
  const cities = [...new Set(areas.map((a) => a.city))];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-accent-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-accent-700 ring-1 ring-accent-200">
                <Truck size={13} /> Free pickup over {peso(1000)}
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-5xl">
                Fresh laundry,<br />picked up and delivered.
              </h1>
              <p className="mt-4 max-w-md text-lg text-ink-600">
                {business.tagline} Book in a minute, pay with GCash or cash, and
                track every step from your phone.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/book" className="sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto">
                    Book a Laundry Service <ChevronRight size={18} />
                  </Button>
                </Link>
                <Link href="/track" className="sm:w-auto">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Track my order
                  </Button>
                </Link>
              </div>

              <p className="mt-4 text-sm text-ink-500">
                No account needed — book as a guest in under a minute.
              </p>
            </div>

            {/* Pricing teaser */}
            <Card className="shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
                Popular services
              </h2>
              <ul className="mt-4 divide-y divide-ink-100">
                {preview.length === 0 && (
                  <li className="py-4 text-sm text-ink-500">
                    Our price list is being set up. Please check back shortly.
                  </li>
                )}
                {preview.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-4 py-3">
                    <div>
                      <p className="font-medium text-ink-900">{s.name}</p>
                      <p className="text-xs text-ink-500">
                        {s.turnaround_hours <= 24
                          ? "Next day"
                          : `${Math.ceil(s.turnaround_hours / 24)} days`}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-right">
                      <span className="font-semibold text-ink-900">{peso(s.price)}</span>
                      <span className="block text-xs text-ink-500">{UNIT_LABEL[s.unit]}</span>
                    </p>
                  </li>
                ))}
              </ul>
              <Link
                href="/services"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-700 hover:text-accent-800"
              >
                See all services & pricing <ChevronRight size={15} />
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-900">How it works</h2>
        <p className="mt-2 text-ink-600">Four steps, about a minute of your time.</p>

        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
                <step.icon size={20} />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent-700">
                Step {i + 1}
              </p>
              <h3 className="mt-1 font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Coverage */}
      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
                Where we pick up
              </h2>
              <p className="mt-2 text-ink-600">
                We cover {areas.length > 0 ? `${areas.length} barangays` : "selected barangays"}
                {cities.length > 0 && ` across ${cities.join(", ")}`}. Outside our
                area? You can still drop off at the shop.
              </p>
              <p className="mt-4 text-sm text-ink-600">
                <MapPin size={15} className="mr-1 inline text-accent-600" />
                {business.address}
              </p>
              <Link href="/book" className="mt-6 inline-block">
                <Button>Check my area</Button>
              </Link>
            </div>

            <div className="flex flex-wrap content-start gap-2">
              {areas.map((a) => (
                <span
                  key={a.id}
                  className="rounded-full bg-white px-3 py-1.5 text-sm text-ink-700 ring-1 ring-ink-200"
                >
                  {a.name}
                  <span className="ml-1.5 text-xs text-ink-400">{a.city}</span>
                </span>
              ))}
              {areas.length === 0 && (
                <p className="text-sm text-ink-500">
                  Coverage areas will appear here once configured.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
          Why choose Cleenzy
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r) => (
            <div key={r.title}>
              <r.icon size={22} className="text-accent-600" />
              <h3 className="mt-3 font-semibold text-ink-900">{r.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-900">
          Frequently asked questions
        </h2>
        <div className="mt-6 divide-y divide-ink-200 border-y border-ink-200">
          {FAQS.slice(0, 5).map((f) => (
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
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent-700 hover:text-accent-800"
        >
          More questions & contact details <ChevronRight size={15} />
        </Link>
      </section>

      {/* Final CTA */}
      <section className="bg-accent-600">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Ready for a lighter week?
            </h2>
            <p className="mt-1.5 text-accent-50">
              Book a pickup now — it takes about a minute.
            </p>
          </div>
          <Link href="/book">
            <Button size="lg" className="bg-white text-accent-700 hover:bg-accent-50">
              Book a Laundry Service
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

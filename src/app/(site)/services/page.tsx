import Link from "next/link";
import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { getServices } from "@/lib/data";
import { peso } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/status";
import { Button, Card, EmptyState, PageHeader, Alert } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description:
    "Wash & fold from ₱80/kg, dry cleaning, comforters, curtains, shoes and ironing. " +
    "Transparent per-kilo and per-piece pricing with next-day turnaround.",
};

function turnaround(hours: number): string {
  if (hours <= 24) return "Next day";
  const days = Math.ceil(hours / 24);
  return `${days} days`;
}

export default async function ServicesPage() {
  const services = await getServices();
  const configured = isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader
        title="Services & Pricing"
        description="Straightforward rates, no hidden charges. We weigh your laundry on arrival and you pay for the actual weight."
      />

      {!configured && (
        <div className="mb-6">
          <Alert tone="warn">
            The service catalogue is not connected yet. Add your Supabase
            environment variables and run the migrations to see live pricing.
          </Alert>
        </div>
      )}

      {services.length === 0 ? (
        <EmptyState
          title="No services published yet"
          description="Once services are added in the admin area they will appear here immediately."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-ink-900">{s.name}</h2>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600">
                  <Clock size={12} /> {turnaround(s.turnaround_hours)}
                </span>
              </div>

              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
                {s.description}
              </p>

              <div className="mt-5 flex items-end justify-between border-t border-ink-100 pt-4">
                <div>
                  <p className="text-2xl font-semibold text-ink-900">{peso(s.price)}</p>
                  <p className="text-xs text-ink-500">{UNIT_LABEL[s.unit]}</p>
                </div>
                <Link href={`/book?service=${s.slug}`}>
                  <Button size="sm">Book this</Button>
                </Link>
              </div>

              {Number(s.min_quantity) > 1 && (
                <p className="mt-2 text-xs text-ink-500">
                  Minimum {Number(s.min_quantity)}{" "}
                  {s.unit === "per_kg" ? "kg" : s.unit === "per_pair" ? "pairs" : "pieces"} per order.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="mt-12 rounded-card bg-ink-50 p-6 sm:p-8">
        <h2 className="font-semibold text-ink-900">How your total is calculated</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
          Your total is the quantity multiplied by the service rate, plus the
          pickup and delivery fee for your area, less any discount. You will see
          the full breakdown before you confirm, and again on your receipt.
          Delivery is free once your order passes your area&apos;s free-delivery
          threshold.
        </p>
        <Link href="/book" className="mt-5 inline-block">
          <Button>Book a laundry service</Button>
        </Link>
      </div>
    </div>
  );
}

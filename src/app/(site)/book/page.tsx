import type { Metadata } from "next";
import { getServices, getServiceAreas, getTimeSlots, getPaymentSettings, isSupabaseConfigured } from "@/lib/data";
import { BookingForm } from "./form";
import { Alert, EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a Laundry Service",
  description:
    "Book laundry pickup and delivery with one simple form. No account " +
    "needed — pay with GCash, cash or bank transfer.",
};

export default async function BookPage({
  searchParams,
}: { searchParams: Promise<{ service?: string; area?: string }> }) {
  const { service, area } = await searchParams;

  const [services, areas, slots, payments] = await Promise.all([
    getServices(), getServiceAreas(), getTimeSlots(), getPaymentSettings(),
  ]);

  if (services.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <PageHeader title="Book a Laundry Service" />
        {!isSupabaseConfigured() && (
          <div className="mb-6">
            <Alert tone="warn">
              Booking is not connected yet. Add your Supabase environment
              variables and run the migrations in <code>supabase/migrations</code>.
            </Alert>
          </div>
        )}
        <EmptyState
          title="No services available"
          description="Services need to be published in the admin area before customers can book."
        />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">
          Book a Laundry Service
        </h1>
        <p className="mt-1.5 text-ink-500">
          One quick form — no account needed.
        </p>
      </div>

      <BookingForm
        services={services}
        areas={areas}
        slots={slots}
        payments={payments}
        preselectSlug={service}
        preselectAreaId={area}
      />
    </>
  );
}

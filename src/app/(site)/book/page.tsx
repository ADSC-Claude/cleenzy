import type { Metadata } from "next";
import { getServices, getServiceAreas, getTimeSlots, getPaymentSettings, isSupabaseConfigured } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { BookingWizard } from "./wizard";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import type { Address, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a Laundry Service",
  description:
    "Book laundry pickup and delivery in a minute. Choose your service, pick a " +
    "time slot, and pay with GCash, cash or bank transfer.",
};

export default async function BookPage({
  searchParams,
}: { searchParams: Promise<{ service?: string; area?: string }> }) {
  const { service, area } = await searchParams;

  const [services, areas, slots, payments] = await Promise.all([
    getServices(), getServiceAreas(), getTimeSlots(), getPaymentSettings(),
  ]);

  // Signed-in customers get their details and saved addresses pre-filled;
  // guests simply see empty fields.
  let profile: Profile | null = null;
  let savedAddresses: Address[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [{ data: p }, { data: a }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase.from("addresses").select("*").eq("customer_id", user.id)
            .order("is_default", { ascending: false }),
        ]);
        profile = (p as Profile) ?? null;
        savedAddresses = (a as Address[]) ?? [];
      }
    } catch {
      // Booking works fine for guests; a session lookup failure is not fatal.
    }
  }

  if (services.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
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
      <div className="border-b border-ink-200 bg-ink-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Book a Laundry Service
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            About a minute. No account needed.
          </p>
        </div>
      </div>

      <BookingWizard
        services={services}
        areas={areas}
        slots={slots}
        savedAddresses={savedAddresses}
        payments={payments}
        signedInName={profile?.full_name ?? ""}
        signedInPhone={profile?.phone ?? ""}
        signedInEmail={profile?.email ?? ""}
        preselectSlug={service}
        preselectAreaId={area}
      />
    </>
  );
}

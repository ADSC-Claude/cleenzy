import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Copy } from "lucide-react";
import { getBusiness, getPaymentSettings } from "@/lib/data";
import { Button, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking confirmed",
  robots: { index: false },
};

export default async function ConfirmedPage({
  searchParams,
}: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const [business, payments] = await Promise.all([
    getBusiness(), getPaymentSettings(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <CheckCircle2 size={52} className="mx-auto text-accent-600" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-900">
          Booking confirmed
        </h1>
        <p className="mt-2 text-ink-600">
          We have sent a confirmation to the contact details you gave us.
        </p>
      </div>

      {order && (
        <Card className="mt-8 text-center">
          <p className="text-sm text-ink-500">Your order number</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-ink-900">
            {order}
          </p>
          <p className="mt-3 text-sm text-ink-600">
            Keep this handy — you can track your laundry with this number and
            the mobile number you booked with.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/track?order=${encodeURIComponent(order)}`}>
              <Button className="w-full sm:w-auto">Track this order</Button>
            </Link>
            <Link href="/">
              <Button variant="secondary" className="w-full sm:w-auto">
                Back to home
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <Card className="mt-5 bg-accent-50">
        <h2 className="font-semibold text-ink-900">Paying by GCash or bank?</h2>
        <p className="mt-2 text-sm text-ink-700">
          Send your payment to <strong>{payments.gcash_number}</strong> (
          {payments.gcash_name}) or {payments.bank_name}{" "}
          <strong>{payments.bank_account_number}</strong>, using{" "}
          <strong>{order ?? "your order number"}</strong> as the reference.
          Paying cash on delivery? Nothing to do — just have it ready for the rider.
        </p>
      </Card>

      <p className="mt-8 text-center text-sm text-ink-500">
        <Copy size={14} className="mr-1 inline" />
        Questions? Call or Viber us at{" "}
        <a href={`tel:${business.phone.replace(/\s/g, "")}`}
           className="text-accent-700 hover:text-accent-800">
          {business.phone}
        </a>
      </p>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, Save } from "lucide-react";
import { saveSettings } from "../actions";
import { Alert, Button, Card, CardTitle, Field, Input, Select } from "@/components/ui";
import type { BusinessSettings, PaymentSettings, SiteSettings } from "@/lib/data";

interface Operations {
  default_pickup_fee: number;
  default_delivery_fee: number;
  free_delivery_over: number;
  min_lead_hours: number;
  standard_turnaround_hours: number;
}

export function SettingsForm({
  business: initialBusiness,
  payments: initialPayments,
  operations: initialOperations,
  site: initialSite,
}: {
  business: BusinessSettings;
  payments: PaymentSettings;
  operations: Operations;
  site: SiteSettings;
}) {
  const [business, setBusiness] = useState(initialBusiness);
  const [payments, setPayments] = useState(initialPayments);
  const [operations, setOperations] = useState(initialOperations);
  const [site, setSite] = useState(initialSite);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(key: string, value: Record<string, unknown>, what: string) {
    setError(null); setNotice(null);
    startTransition(async () => {
      const result = await saveSettings(key, value);
      if (result.ok) setNotice(`${what} saved and live on the website.`);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card>
        <CardTitle>Website visibility</CardTitle>
        <p className="mt-1 text-xs text-ink-500">
          Hide the customer website while you get ready. Signed-in staff keep
          full access either way, so you can test booking and tracking before
          anyone else sees them.
        </p>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
          {site.status === "live"
            ? <Eye size={18} className="mt-0.5 shrink-0 text-accent-600" />
            : <EyeOff size={18} className="mt-0.5 shrink-0 text-ink-500" />}
          <p className="text-sm text-ink-700">
            {site.status === "live"
              ? "The website is live. Anyone with the link can browse and book."
              : "The website is hidden. Visitors see a “coming soon” page instead."}
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Status"
            hint="Takes effect immediately — no redeploy needed."
          >
            <Select
              value={site.status}
              onChange={(e) => setSite({
                ...site, status: e.target.value as SiteSettings["status"],
              })}
            >
              <option value="coming_soon">Hidden — show “coming soon”</option>
              <option value="live">Live — open to customers</option>
            </Select>
          </Field>
          <Field label="Holding page headline">
            <Input value={site.headline}
                   onChange={(e) => setSite({ ...site, headline: e.target.value })} />
          </Field>
          <Field label="Holding page message" className="sm:col-span-2">
            <Input value={site.message}
                   onChange={(e) => setSite({ ...site, message: e.target.value })} />
          </Field>
        </div>
        <Button
          className="mt-4" disabled={pending}
          onClick={() => save("site", { ...site }, "Website visibility")}
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save website visibility
        </Button>
      </Card>

      <Card>
        <CardTitle>Business details</CardTitle>
        <p className="mt-1 text-xs text-ink-500">
          Shown in the website footer, on the contact page and on printed receipts.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <Input value={business.name}
                   onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
          </Field>
          <Field label="Tagline">
            <Input value={business.tagline}
                   onChange={(e) => setBusiness({ ...business, tagline: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={business.phone}
                   onChange={(e) => setBusiness({ ...business, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={business.email}
                   onChange={(e) => setBusiness({ ...business, email: e.target.value })} />
          </Field>
          <Field label="Shop address" className="sm:col-span-2">
            <Input value={business.address}
                   onChange={(e) => setBusiness({ ...business, address: e.target.value })} />
          </Field>
          <Field label="Opening hours" className="sm:col-span-2">
            <Input value={business.hours}
                   onChange={(e) => setBusiness({ ...business, hours: e.target.value })} />
          </Field>
        </div>
        <Button
          className="mt-4" disabled={pending}
          onClick={() => save("business", { ...business }, "Business details")}
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save business details
        </Button>
      </Card>

      <Card>
        <CardTitle>Payment details</CardTitle>
        <p className="mt-1 text-xs text-ink-500">
          Customers see these when they choose GCash or bank transfer.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="GCash account name">
            <Input value={payments.gcash_name}
                   onChange={(e) => setPayments({ ...payments, gcash_name: e.target.value })} />
          </Field>
          <Field label="GCash number">
            <Input value={payments.gcash_number}
                   onChange={(e) => setPayments({ ...payments, gcash_number: e.target.value })} />
          </Field>
          <Field label="Bank">
            <Input value={payments.bank_name}
                   onChange={(e) => setPayments({ ...payments, bank_name: e.target.value })} />
          </Field>
          <Field label="Bank account name">
            <Input value={payments.bank_account_name}
                   onChange={(e) => setPayments({ ...payments, bank_account_name: e.target.value })} />
          </Field>
          <Field label="Bank account number">
            <Input value={payments.bank_account_number}
                   onChange={(e) => setPayments({ ...payments, bank_account_number: e.target.value })} />
          </Field>
          <Field
            label="Card payments"
            hint="Turn on only once a payment gateway is connected."
          >
            <Select
              value={payments.card_enabled ? "yes" : "no"}
              onChange={(e) =>
                setPayments({ ...payments, card_enabled: e.target.value === "yes" })
              }
            >
              <option value="no">Disabled</option>
              <option value="yes">Enabled</option>
            </Select>
          </Field>
        </div>
        <Button
          className="mt-4" disabled={pending}
          onClick={() => save("payments", { ...payments }, "Payment details")}
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save payment details
        </Button>
      </Card>

      <Card>
        <CardTitle>Operations</CardTitle>
        <p className="mt-1 text-xs text-ink-500">
          Defaults for new coverage areas. Existing areas keep their own fees.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Default pickup fee">
            <Input type="number" min={0} value={operations.default_pickup_fee}
                   onChange={(e) => setOperations({
                     ...operations, default_pickup_fee: Number(e.target.value),
                   })} />
          </Field>
          <Field label="Default delivery fee">
            <Input type="number" min={0} value={operations.default_delivery_fee}
                   onChange={(e) => setOperations({
                     ...operations, default_delivery_fee: Number(e.target.value),
                   })} />
          </Field>
          <Field label="Free delivery over">
            <Input type="number" min={0} value={operations.free_delivery_over}
                   onChange={(e) => setOperations({
                     ...operations, free_delivery_over: Number(e.target.value),
                   })} />
          </Field>
          <Field label="Standard turnaround (hours)">
            <Input type="number" min={1} value={operations.standard_turnaround_hours}
                   onChange={(e) => setOperations({
                     ...operations, standard_turnaround_hours: Number(e.target.value),
                   })} />
          </Field>
        </div>
        <Button
          className="mt-4" disabled={pending}
          onClick={() => save("operations", { ...operations }, "Operations settings")}
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save operations
        </Button>
      </Card>
    </div>
  );
}

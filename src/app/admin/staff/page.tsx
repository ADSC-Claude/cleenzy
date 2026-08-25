import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert, Card, PageHeader } from "@/components/ui";
import { StaffTable } from "./table";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const me = await requireRole("/admin/staff", ["owner", "manager"]);
  const supabase = await createClient();

  // Every profile is either staff or a pending sign-up awaiting a role, so
  // the owner sees them all here — there are no customer accounts.
  const { data } = await supabase
    .from("profiles").select("*")
    .order("role")
    .order("full_name");

  return (
    <>
      <PageHeader
        title="Staff & Roles"
        description="Who can reach what. Permissions are enforced in the database, not just in this interface."
      />

      <div className="mb-5">
        <Alert tone="info">
          New staff create an account at <code>/signup</code>, then you assign
          their role here. A fresh account can&apos;t reach anything until you do.
        </Alert>
      </div>

      <StaffTable
        people={(data ?? []) as Profile[]}
        currentUserId={me.id}
        currentRole={me.role}
      />

      <Card className="mt-5">
        <h2 className="font-semibold text-ink-900">What each role can see</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-600">
          <li><strong className="text-ink-900">Owner</strong> — everything, including settings and staff.</li>
          <li><strong className="text-ink-900">Manager</strong> — orders, customers, reports and staff, but not settings.</li>
          <li><strong className="text-ink-900">Cashier</strong> — orders and payments. No access to reports.</li>
          <li><strong className="text-ink-900">Laundry staff</strong> — the laundry queue only, with no prices or totals anywhere on screen.</li>
          <li><strong className="text-ink-900">Rider</strong> — only the pickups and deliveries assigned to them, plus the amount to collect.</li>
        </ul>
      </Card>
    </>
  );
}

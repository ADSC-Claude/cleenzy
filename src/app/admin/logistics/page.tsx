import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { LogisticsQueues, type TaskRow } from "./queues";
import type { Profile, TaskType } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RawTask {
  id: string; order_id: string; task_type: TaskType; status: TaskRow["status"];
  scheduled_date: string | null; rider_id: string | null; cod_amount: number;
  notes: string | null;
  orders: {
    order_number: string; customer_name: string; customer_phone: string;
    total_amount: number; amount_paid: number;
  } | null;
  time_slots: { label: string } | null;
  addresses: { barangay: string | null; city: string } | null;
}

export default async function LogisticsPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  await requireRole("/admin/logistics", ["owner", "manager", "cashier"]);
  const { tab } = await searchParams;
  const supabase = await createClient();

  const [{ data: taskRows, error }, { data: riderRows }] = await Promise.all([
    supabase
      .from("delivery_tasks")
      .select(`
        id, order_id, task_type, status, scheduled_date, rider_id, cod_amount, notes,
        orders ( order_number, customer_name, customer_phone, total_amount, amount_paid ),
        time_slots ( label ),
        addresses ( barangay, city )
      `)
      .not("status", "in", "(delivered,failed)")
      .order("scheduled_date", { ascending: true }),
    supabase.from("profiles").select("*").eq("role", "rider").eq("is_active", true),
  ]);

  if (error) console.error("[cleenzy] logistics read failed:", error);

  const tasks = ((taskRows ?? []) as unknown as RawTask[]).map<TaskRow>((t) => ({
    id: t.id,
    order_id: t.order_id,
    task_type: t.task_type,
    status: t.status,
    scheduled_date: t.scheduled_date,
    rider_id: t.rider_id,
    cod_amount: Number(t.cod_amount),
    notes: t.notes,
    order_number: t.orders?.order_number ?? "—",
    customer_name: t.orders?.customer_name ?? "—",
    customer_phone: t.orders?.customer_phone ?? "",
    area: [t.addresses?.barangay, t.addresses?.city].filter(Boolean).join(", ") || "—",
    slot_label: t.time_slots?.label ?? null,
    balance: Number(t.orders?.total_amount ?? 0) - Number(t.orders?.amount_paid ?? 0),
  }));

  return (
    <>
      <PageHeader
        title="Pickup & Delivery"
        description="Assign riders and move each run along as it happens."
      />
      <LogisticsQueues
        pickups={tasks.filter((t) => t.task_type === "pickup")}
        deliveries={tasks.filter((t) => t.task_type === "delivery")}
        riders={(riderRows ?? []) as Profile[]}
        initialTab={tab === "delivery" ? "delivery" : "pickup"}
      />
    </>
  );
}

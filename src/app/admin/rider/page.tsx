import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { RiderRuns, type RiderTask } from "./runs";

export const dynamic = "force-dynamic";

export default async function RiderPage() {
  const profile = await requireStaff("/admin/rider");
  const supabase = await createClient();

  // rider_tasks is filtered to the signed-in rider inside the view itself, so
  // a rider cannot widen it by editing the query.
  const { data, error } = await supabase
    .from("rider_tasks")
    .select("*")
    .not("status", "in", "(delivered,failed)")
    .order("scheduled_date")
    .order("sequence");

  if (error) console.error("[cleenzy] rider tasks read failed:", error);

  const tasks = (data ?? []) as RiderTask[];

  return (
    <>
      <PageHeader
        title="My Runs"
        description={
          profile.role === "rider"
            ? `${tasks.length} stop${tasks.length === 1 ? "" : "s"} assigned to you`
            : "All open pickups and deliveries"
        }
      />
      <RiderRuns tasks={tasks} />
    </>
  );
}

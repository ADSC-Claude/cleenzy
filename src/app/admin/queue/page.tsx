import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { QueueBoard, type QueueCard } from "./board";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  await requireStaff("/admin/queue");
  const supabase = await createClient();

  // laundry_queue is a money-free view; it is the only orders surface laundry
  // staff can read, and managers see exactly the same board.
  const { data, error } = await supabase
    .from("laundry_queue").select("*").order("placed_at");

  if (error) console.error("[cleenzy] laundry queue read failed:", error);

  return (
    <>
      <PageHeader
        title="Laundry Queue"
        description="Move each order along as you work on it. One tap per stage."
      />
      <QueueBoard cards={(data ?? []) as QueueCard[]} />
    </>
  );
}

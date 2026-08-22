import type { Metadata } from "next";
import { Tracker } from "./tracker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track Order",
  description: "See exactly where your laundry is, from pickup to delivery.",
};

export default async function TrackPage({
  searchParams,
}: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return <Tracker initialOrderNumber={order ?? ""} />;
}

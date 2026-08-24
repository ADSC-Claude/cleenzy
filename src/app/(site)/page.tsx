import Link from "next/link";
import {
  ArrowRight, CalendarCheck, Truck, WashingMachine, ShieldCheck, Leaf,
  Sparkles, MapPin, Zap, Shirt, Wind, Bed, Blinds, Footprints, Flame, Star,
  Heart, type LucideIcon,
} from "lucide-react";
import { getServices, getServiceAreas } from "@/lib/data";
import { peso } from "@/lib/format";
import { Sparkle } from "@/components/site/logo";

export const dynamic = "force-dynamic";

/* Maps the icon slug stored on each service to a drawable icon. */
const SERVICE_ICON: Record<string, LucideIcon> = {
  shirt: Shirt, wind: Wind, sparkles: Sparkles, bed: Bed,
  blinds: Blinds, footprints: Footprints, flame: Flame, star: Star,
};

const TILE_TONES = [
  "bg-pastel-blue", "bg-pastel-cream", "bg-pastel-lavender", "bg-pastel-mint",
];

const STEPS = [
  {
    n: 1, icon: CalendarCheck, tone: "bg-pastel-blue",
    title: "Book",
    body: "Schedule your pickup in just a few taps.",
  },
  {
    n: 2, icon: Truck, tone: "bg-pastel-lime",
    title: "We Pick Up",
    body: "We collect your laundry right at your door.",
  },
  {
    n: 3, icon: WashingMachine, tone: "bg-pastel-lavender",
    title: "We Clean & Deliver",
    body: "Fresh, clean clothes delivered back to you.",
  },
];

const REASONS = [
  { icon: Truck, title: "Pickup & Delivery", body: "Door to door, on your schedule" },
  { icon: ShieldCheck, title: "Safe & Reliable", body: "Your load is never mixed" },
  { icon: Leaf, title: "Eco-Friendly Cleaning", body: "Gentle on clothes and planet" },
  { icon: Sparkles, title: "Fresh, Clean Every Time", body: "Counted in, counted out" },
];

export default async function HomePage() {
  const [services, areas] = await Promise.all([getServices(), getServiceAreas()]);
  const tiles = services.slice(0, 4);

  return (
    <>
      {/* ------------------------------------------------------------- Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-4 py-1.5 text-sm font-semibold text-accent-800">
              <Sparkle className="h-3 w-3 text-accent-500" /> Laundry made easy
            </span>

            <h1 className="mt-5 text-5xl font-extrabold leading-[1.04] tracking-tight text-ink-900 sm:text-6xl">
              Clean clothes.
              <span className="relative mt-1 block text-accent-600">
                Zero stress.
                <svg
                  viewBox="0 0 220 12" aria-hidden
                  className="absolute -bottom-2 left-0 h-3 w-52 text-pastel-note sm:w-60"
                >
                  <path d="M3 9C60 3 150 2 217 6" stroke="currentColor" strokeWidth="5"
                        strokeLinecap="round" fill="none" opacity="0.9" />
                </svg>
              </span>
            </h1>

            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-600">
              We pick up, clean, and deliver your laundry fresh and on time — so
              you can do more of what you love.{" "}
              <Heart size={18} className="inline -mt-1 text-accent-500" strokeWidth={2.5} />
            </p>

            {/* Booking card */}
            <div className="mt-8 max-w-md rounded-card border border-white/70 bg-white p-5 shadow-[0_18px_45px_-22px_rgba(11,27,51,0.3)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-ink-900">Book a Pickup</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-pastel-lime px-3 py-1 text-xs font-semibold text-ink-700">
                  Fast &amp; Easy <Zap size={12} className="text-accent-600" />
                </span>
              </div>

              {areas.length > 0 ? (
                <form action="/book" className="mt-4 space-y-3">
                  <label className="relative block">
                    <MapPin size={17}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                    <select
                      name="area"
                      defaultValue=""
                      aria-label="Your address or area"
                      className="h-12 w-full appearance-none rounded-full border border-ink-200 bg-white pl-11 pr-10 text-[15px] text-ink-800 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                    >
                      <option value="">Enter your address or area</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} — {a.city}</option>
                      ))}
                    </select>
                    <svg viewBox="0 0 12 8" aria-hidden
                         className="pointer-events-none absolute right-4 top-1/2 h-2 w-3 -translate-y-1/2 text-ink-400">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.8"
                            strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </label>
                  <button
                    type="submit"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent-600 text-[15px] font-semibold text-white transition-colors hover:bg-accent-700"
                  >
                    Book Now <ArrowRight size={17} />
                  </button>
                </form>
              ) : (
                <Link
                  href="/book"
                  className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent-600 text-[15px] font-semibold text-white transition-colors hover:bg-accent-700"
                >
                  Book Now <ArrowRight size={17} />
                </Link>
              )}

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-ink-500">
                <Truck size={14} className="text-accent-500" /> Free delivery over {peso(1000)}
              </p>
            </div>
          </div>

          <LaundryStack />
        </div>
      </section>

      {/* ----------------------------------------------------- How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-20 sm:px-6 sm:pt-24">
        <div className="text-center">
          <h2 className="relative inline-block text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            How It Works
            <TitleTick />
          </h2>
          <p className="mt-2 text-ink-500">Laundry, but make it simple.</p>
        </div>

        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative rounded-card bg-white p-7 text-center shadow-[0_14px_35px_-24px_rgba(11,27,51,0.35)]">
              <span className="absolute left-5 top-5 grid h-8 w-8 place-items-center rounded-full border-2 border-ink-200 text-sm font-bold text-ink-700">
                {s.n}
              </span>
              <span className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${s.tone}`}>
                <s.icon size={30} className="text-ink-800" strokeWidth={1.7} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-ink-900">{s.title}</h3>
              <p className="mx-auto mt-1.5 max-w-[24ch] text-[15px] leading-relaxed text-ink-500">
                {s.body}
              </p>
              {i < STEPS.length - 1 && (
                <ArrowRight
                  size={22}
                  className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-ink-400 sm:block"
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------- Why choose */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
        <div className="rounded-[2.5rem] bg-accent-100/60 px-6 py-12 sm:px-12 sm:py-14">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Why Choose Cleenzy?{" "}
            <Heart size={26} className="inline -mt-1.5 text-accent-500" strokeWidth={2.5} />
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-4">
            {REASONS.map((r) => (
              <div key={r.title} className="text-center">
                <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white shadow-[0_10px_25px_-16px_rgba(11,27,51,0.4)]">
                  <r.icon size={28} className="text-ink-800" strokeWidth={1.7} />
                </span>
                <h3 className="mt-4 font-bold leading-snug text-ink-900">{r.title}</h3>
                <p className="mx-auto mt-1 max-w-[22ch] text-[13px] text-ink-500">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Services */}
      {tiles.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-20">
          <div className="text-center">
            <h2 className="relative inline-block text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
              Our Services
              <TitleTick />
            </h2>
            <p className="mt-2 text-ink-500">Fresh for everyday, for everything.</p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map((s, i) => {
              const Icon = SERVICE_ICON[s.icon ?? ""] ?? WashingMachine;
              return (
                <Link
                  key={s.id}
                  href={`/book?service=${s.slug}`}
                  className="group overflow-hidden rounded-card bg-white shadow-[0_14px_35px_-24px_rgba(11,27,51,0.35)] transition-transform hover:-translate-y-1"
                >
                  <div className={`grid h-36 place-items-center ${TILE_TONES[i % TILE_TONES.length]} sm:h-44`}>
                    <Icon size={52} className="text-ink-800/80" strokeWidth={1.3} />
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-ink-900">{s.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {peso(s.price)} {s.unit === "per_kg" ? "per kg"
                          : s.unit === "per_pair" ? "per pair" : "per piece"}
                      </p>
                    </div>
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-full border border-ink-200 text-ink-500 transition-colors group-hover:border-accent-600 group-hover:bg-accent-600 group-hover:text-white">
                      <ArrowRight size={15} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <p className="mt-6 text-center">
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 hover:text-accent-700"
            >
              See all services &amp; pricing <ArrowRight size={15} />
            </Link>
          </p>
        </section>
      )}

      {/* -------------------------------------------------------- Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-4 pt-16 sm:px-6 sm:pt-20">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-accent-100/60 px-8 py-12 sm:px-14">
          <svg viewBox="0 0 900 60" preserveAspectRatio="none" aria-hidden
               className="absolute inset-x-0 bottom-0 h-10 w-full text-accent-200/50">
            <path d="M0 40 Q150 10 320 32 T650 28 T900 38 L900 60 L0 60 Z" fill="currentColor" />
          </svg>
          <div className="relative flex flex-col items-center justify-between gap-8 sm:flex-row">
            <p className="font-hand text-5xl leading-tight text-ink-900 sm:text-6xl">
              Less laundry.<br />
              <span className="pl-6">More you.</span>{" "}
              <Heart size={30} className="inline -mt-2 text-accent-500" strokeWidth={2.5} />
            </p>
            <div className="text-center sm:text-right">
              <p className="text-[15px] font-medium text-ink-700">
                Experience the easier, fresher way to do laundry.
              </p>
              <Link
                href="/book"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-600 px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-accent-700"
              >
                Book a Pickup Now <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** Little blue tick marks beside section titles, echoing the wordmark. */
function TitleTick() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden
         className="absolute -right-7 -top-1 h-5 w-5 text-accent-500">
      <path d="M4 20L10 12M12 22l3-9M18 19l4-5" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Illustrated hero: a stack of freshly folded laundry in a basket, with a
 * handwritten sticky note. Pure CSS/SVG, so it costs nothing on mobile data.
 */
function LaundryStack() {
  const towels = [
    { w: "w-[70%]", c: "bg-accent-300" },
    { w: "w-[80%]", c: "bg-pastel-cream" },
    { w: "w-[74%]", c: "bg-accent-200" },
    { w: "w-[85%]", c: "bg-white" },
    { w: "w-[78%]", c: "bg-accent-400" },
  ];
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-pastel-blue/70 to-accent-100/40 px-8 pb-0 pt-14 sm:px-12">
        {/* soft glow */}
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 blur-2xl" />

        {/* sticky note */}
        <div className="absolute right-12 top-10 z-10 -rotate-6 rounded-sm bg-pastel-note px-4 py-3 shadow-[0_10px_20px_-10px_rgba(11,27,51,0.35)] sm:right-16">
          <p className="font-hand text-2xl leading-[1.05] text-ink-800">
            fresh<br />clean<br />done.
          </p>
          <svg viewBox="0 0 24 24" className="mt-1 h-5 w-5 text-ink-800" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="9" cy="10" r="1.1" fill="currentColor" />
            <circle cx="15" cy="10" r="1.1" fill="currentColor" />
            <path d="M8.5 14c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        {/* leaf */}
        <svg viewBox="0 0 60 80" aria-hidden
             className="absolute -left-2 top-6 h-24 w-16 text-accent-300/70">
          <path d="M30 78C10 60 4 34 16 12 34 22 46 44 40 70c-3-14-9-26-18-34 7 12 10 26 8 42z"
                fill="currentColor" />
        </svg>

        {/* folded stack */}
        <div className="relative flex flex-col items-center">
          {towels.map((t, i) => (
            <div
              key={i}
              className={`${t.w} ${t.c} h-10 rounded-[16px] border-b border-ink-900/10 shadow-[0_6px_14px_-8px_rgba(11,27,51,0.3)] sm:h-12`}
              style={{ marginTop: i === 0 ? 0 : -8 }}
            >
              <div className="mx-auto mt-3 h-[3px] w-1/2 rounded-full bg-ink-900/5 sm:mt-4" />
            </div>
          ))}

          {/* basket */}
          <div
            className="relative -mt-1 h-28 w-[92%] rounded-b-[2rem] rounded-t-md bg-white shadow-[0_18px_40px_-20px_rgba(11,27,51,0.4)] sm:h-32"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(37,99,235,0.16) 4px, transparent 5px)",
              backgroundSize: "26px 22px",
              backgroundPosition: "6px 14px",
              clipPath: "polygon(0 0, 100% 0, 92% 100%, 8% 100%)",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-3.5 rounded-md bg-white shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

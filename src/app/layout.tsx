import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

// Handwritten accents — sticky notes, "Less laundry. More you."
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cleenzy — Clean clothes. Zero stress.",
    template: "%s · Cleenzy",
  },
  description:
    "We pick up, clean, and deliver your laundry fresh and on time. " +
    "Book in a minute, pay with GCash, cash or bank transfer.",
  openGraph: {
    title: "Cleenzy — Clean clothes. Zero stress.",
    description: "We pick up, clean, and deliver your laundry fresh and on time.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-PH" className={`${jakarta.variable} ${caveat.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cleenzy — Laundry Pickup & Delivery",
    template: "%s · Cleenzy",
  },
  description:
    "Wash & fold laundry with free pickup and delivery around Metro Manila. " +
    "Book in a minute, pay with GCash, cash or bank transfer.",
  openGraph: {
    title: "Cleenzy — Laundry Pickup & Delivery",
    description: "Fresh laundry, picked up and delivered.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d8b82",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-PH" className={inter.variable}>
      <body className="min-h-screen bg-white antialiased">{children}</body>
    </html>
  );
}

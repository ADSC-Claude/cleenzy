import type { Metadata } from "next";
import { SignupForm } from "./form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Staff account", robots: { index: false } };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
        Create a staff account
      </h1>
      <p className="mt-1 text-sm text-ink-600">
        For the Cleenzy team. Your account can&apos;t do anything until the
        owner assigns you a role in Admin → Staff. Customers don&apos;t need
        an account to book.
      </p>
      <div className="mt-6">
        <SignupForm />
      </div>
    </div>
  );
}

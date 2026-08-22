import type { Metadata } from "next";
import { SignupForm } from "./form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-ink-600">
        Save your addresses and see all your past orders in one place.
      </p>
      <div className="mt-6">
        <SignupForm />
      </div>
    </div>
  );
}

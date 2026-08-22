import type { Metadata } from "next";
import { LoginForm } from "./form";
import { Alert } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Sign in</h1>
      <p className="mt-1 text-sm text-ink-600">
        Customers and staff sign in here.
      </p>

      {!isSupabaseConfigured() && (
        <div className="mt-5">
          <Alert tone="warn">
            Sign-in is not connected yet. Add your Supabase environment
            variables and apply the migrations in{" "}
            <code>supabase/migrations</code> to enable accounts and the admin
            area.
          </Alert>
        </div>
      )}

      {error === "inactive" && (
        <div className="mt-5">
          <Alert tone="error">
            This account has been deactivated. Please contact your manager.
          </Alert>
        </div>
      )}

      <div className="mt-6">
        <LoginForm next={next ?? ""} />
      </div>
    </div>
  );
}

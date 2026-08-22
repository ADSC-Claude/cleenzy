"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signUp, type AuthState } from "@/lib/auth-actions";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

const initial: AuthState = { error: null };

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initial);

  return (
    <Card>
      <form action={action} className="space-y-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}

        <Field label="Full name" required>
          <Input name="full_name" autoComplete="name" required placeholder="Maria Santos" />
        </Field>
        <Field label="Email" required>
          <Input name="email" type="email" autoComplete="email" required
                 placeholder="you@example.com" />
        </Field>
        <Field label="Mobile number" hint="So we can send you order updates.">
          <Input name="phone" inputMode="tel" autoComplete="tel" placeholder="0917 555 1234" />
        </Field>
        <Field label="Password" required hint="At least 8 characters.">
          <Input name="password" type="password" autoComplete="new-password"
                 required minLength={8} placeholder="••••••••" />
        </Field>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <><Loader2 size={18} className="animate-spin" /> Creating account…</>
                   : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent-700 hover:text-accent-800">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

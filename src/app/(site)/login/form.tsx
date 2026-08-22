"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn, type AuthState } from "@/lib/auth-actions";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

const initial: AuthState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <Card>
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {state.error && <Alert tone="error">{state.error}</Alert>}

        <Field label="Email" required>
          <Input name="email" type="email" autoComplete="email" required
                 placeholder="you@example.com" />
        </Field>
        <Field label="Password" required>
          <Input name="password" type="password" autoComplete="current-password"
                 required placeholder="••••••••" />
        </Field>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <><Loader2 size={18} className="animate-spin" /> Signing in…</>
                   : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-accent-700 hover:text-accent-800">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-ink-500">
        You do not need an account to book — you can{" "}
        <Link href="/book" className="text-accent-700 hover:underline">book as a guest</Link>.
      </p>
    </Card>
  );
}

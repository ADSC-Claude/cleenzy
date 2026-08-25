"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./data";
import { homeFor } from "./auth";
import { isValidPhPhone, normalisePhone } from "./format";
import type { Profile } from "./types";

export type AuthState = { error: string | null };

export async function signIn(
  _prev: AuthState, formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Sign-in is not connected yet." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: never reveal whether an email is registered.
    return { error: "That email and password do not match. Please try again." };
  }

  let destination = next;
  if (!destination) {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    destination = homeFor((profile as Pick<Profile, "role">)?.role ?? "customer");
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signUp(
  _prev: AuthState, formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Sign-up is not connected yet." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 2) return { error: "Enter your full name." };
  if (!email) return { error: "Enter your email address." };
  if (phone && !isValidPhPhone(phone)) {
    return { error: "Enter a valid mobile number, e.g. 0917 555 1234." };
  }
  if (password.length < 8) {
    return { error: "Choose a password of at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone ? normalisePhone(phone) : null,
      },
    },
  });

  if (error) return { error: error.message };

  // New accounts hold no role until the owner assigns one in Admin -> Staff.
  revalidatePath("/", "layout");
  redirect("/login?created=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

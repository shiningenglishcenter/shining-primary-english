"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginIdentifierToEmail } from "@/lib/auth/identifier";
import { isAppRole, safeRedirectPath } from "@/lib/auth/roles";
import {
  ACCOUNT_INACTIVE,
  INVALID_CREDENTIALS,
  SERVICE_UNAVAILABLE,
  TOO_MANY_ATTEMPTS,
  loginSchema,
  type LoginFormState,
} from "@/features/auth/schemas";

export async function signIn(_prev: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  const identifier = String(formData.get("identifier") ?? "").slice(0, 254);

  if (!parsed.success) {
    const fieldErrors: LoginFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "identifier" || field === "password") && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors, identifier };
  }

  const email = loginIdentifierToEmail(parsed.data.identifier);
  if (!email) return { error: INVALID_CREDENTIALS, identifier };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    // Log only the status code — never the identifier or password (SECURITY.md §3).
    if (error?.status === 429) return { error: TOO_MANY_ATTEMPTS, identifier };
    if (error && (error.status ?? 0) >= 500) {
      console.error("[auth] sign-in failed", { status: error.status });
      return { error: SERVICE_UNAVAILABLE, identifier };
    }
    return { error: INVALID_CREDENTIALS, identifier };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, deleted_at")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || !profile.is_active || profile.deleted_at || !isAppRole(profile.role)) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: ACCOUNT_INACTIVE, identifier };
  }

  redirect(safeRedirectPath(parsed.data.next, profile.role));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?reason=signed_out");
}

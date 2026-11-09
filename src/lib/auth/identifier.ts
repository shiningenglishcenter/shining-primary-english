/**
 * Students and parents sign in with a centre-issued username (ARCHITECTURE D16).
 * Supabase Auth needs an email, so each username maps to a non-deliverable
 * internal address. Staff may type their real email instead.
 */
export const INTERNAL_EMAIL_DOMAIN = "users.shining.internal";

/** Same rule as the `profiles.username` check constraint in the database. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,40}$/;

export function usernameToEmail(username: string): string {
  return `${username}@${INTERNAL_EMAIL_DOMAIN}`;
}

/**
 * Turns what the person typed into the email Supabase Auth expects.
 * Returns null when the input is neither a valid username nor an email.
 */
export function loginIdentifierToEmail(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (value.includes("@")) {
    // Basic shape check only; Supabase is the authority on the address.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
  }
  return USERNAME_PATTERN.test(value) ? usernameToEmail(value) : null;
}

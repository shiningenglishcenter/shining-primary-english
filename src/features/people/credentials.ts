import { USERNAME_PATTERN } from "@/lib/auth/identifier";

/**
 * Easy-to-read passwords for children and parents, e.g. "Sao-Mai-4821".
 * Two capitalised Vietnamese syllables (no diacritics, so any keyboard can
 * type them) plus four digits: ~10^4 × 40² ≈ 16 million combinations. That is
 * enough because Supabase Auth rate-limits sign-in attempts, and admins can
 * reset any password.
 */
const SYLLABLES = [
  "Sao",
  "Mai",
  "Hoa",
  "Lan",
  "Cuc",
  "Dao",
  "Tre",
  "Nui",
  "Song",
  "Bien",
  "Trang",
  "Nang",
  "Gio",
  "Mua",
  "May",
  "Xanh",
  "Vang",
  "Hong",
  "Tim",
  "Cam",
  "Ong",
  "Ca",
  "Chim",
  "Meo",
  "Tho",
  "Voi",
  "Ngua",
  "Gau",
  "Sen",
  "Que",
  "Lua",
  "Ngo",
  "Khe",
  "Doi",
  "Rung",
  "Suoi",
  "Dua",
  "Le",
  "Na",
  "Mit",
] as const;

type RandomInt = (maxExclusive: number) => number;

function cryptoRandomInt(maxExclusive: number): number {
  // Rejection sampling avoids modulo bias.
  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % maxExclusive;
  }
}

export function generatePassword(randomInt: RandomInt = cryptoRandomInt): string {
  const a = SYLLABLES[randomInt(SYLLABLES.length)]!;
  let b = SYLLABLES[randomInt(SYLLABLES.length)]!;
  if (b === a) b = SYLLABLES[(SYLLABLES.indexOf(a) + 1) % SYLLABLES.length]!;
  const digits = String(randomInt(10_000)).padStart(4, "0");
  return `${a}-${b}-${digits}`;
}

/** Same minimum as Supabase Auth (`minimum_password_length = 8`). */
export const MIN_PASSWORD_LENGTH = 8;

/** "Nguyễn Thị Đào" → "nguyen thi dao" */
export function toAscii(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export const USERNAME_PREFIX = { student: "hs", teacher: "gv", parent: "ph" } as const;

/**
 * Suggests a username from a Vietnamese full name: prefix + given name (the
 * last word), e.g. "Nguyễn Minh An" → "hs.an". The admin can edit it, and the
 * server appends a number if it is taken.
 */
export function suggestUsername(fullName: string, prefix: keyof typeof USERNAME_PREFIX): string {
  const words = toAscii(fullName)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const given = words.at(-1) ?? "";
  const base = `${USERNAME_PREFIX[prefix]}.${given}`.slice(0, 40);
  return USERNAME_PATTERN.test(base) ? base : "";
}

/** "hs.an" → "hs.an2", "hs.an2" → "hs.an3" */
export function nextUsernameCandidate(username: string): string {
  const match = /^(.*?)(\d+)$/.exec(username);
  if (!match) return `${username}2`.slice(0, 40);
  return `${match[1]}${Number(match[2]) + 1}`.slice(0, 40);
}

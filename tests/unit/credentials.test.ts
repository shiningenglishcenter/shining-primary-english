import { describe, expect, it } from "vitest";
import {
  generatePassword,
  MIN_PASSWORD_LENGTH,
  nextUsernameCandidate,
  suggestUsername,
  toAscii,
} from "@/features/people/credentials";
import { USERNAME_PATTERN } from "@/lib/auth/identifier";

describe("generatePassword", () => {
  it("looks like Word-Word-1234 and meets the minimum length", () => {
    for (let i = 0; i < 200; i++) {
      const pw = generatePassword();
      expect(pw).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-\d{4}$/);
      expect(pw.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
    }
  });

  it("never repeats the same word twice", () => {
    const pw = generatePassword(() => 0);
    const [a, b] = pw.split("-");
    expect(a).not.toBe(b);
    expect(pw).toBe("Sao-Mai-0000");
  });

  it("varies between calls", () => {
    const seen = new Set(Array.from({ length: 50 }, () => generatePassword()));
    expect(seen.size).toBeGreaterThan(45);
  });
});

describe("toAscii", () => {
  it("removes Vietnamese diacritics including đ", () => {
    expect(toAscii("Nguyễn Thị Đào")).toBe("nguyen thi dao");
    expect(toAscii("Trần Đăng Khoa")).toBe("tran dang khoa");
  });
});

describe("suggestUsername", () => {
  it("uses prefix + given name", () => {
    expect(suggestUsername("Nguyễn Minh An", "student")).toBe("hs.an");
    expect(suggestUsername("Cô Lan", "teacher")).toBe("gv.lan");
    expect(suggestUsername("  Lê   Thị Ánh  ", "student")).toBe("hs.anh");
  });

  it("always returns a valid username or an empty string", () => {
    for (const name of ["", "   ", "!!!", "Nguyễn Văn Đức", "Bé 2", "Anh-Thư"]) {
      const u = suggestUsername(name, "student");
      expect(u === "" || USERNAME_PATTERN.test(u)).toBe(true);
    }
  });
});

describe("nextUsernameCandidate", () => {
  it("appends or increments a trailing number", () => {
    expect(nextUsernameCandidate("hs.an")).toBe("hs.an2");
    expect(nextUsernameCandidate("hs.an2")).toBe("hs.an3");
    expect(nextUsernameCandidate("hs.an9")).toBe("hs.an10");
  });
});

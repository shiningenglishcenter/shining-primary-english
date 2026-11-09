import { describe, expect, it } from "vitest";
import { INTERNAL_EMAIL_DOMAIN, loginIdentifierToEmail, usernameToEmail } from "@/lib/auth/identifier";

describe("loginIdentifierToEmail", () => {
  it("maps a username to the internal address", () => {
    expect(loginIdentifierToEmail("hs.an")).toBe(`hs.an@${INTERNAL_EMAIL_DOMAIN}`);
  });

  it("trims and lower-cases what was typed", () => {
    expect(loginIdentifierToEmail("  HS.An  ")).toBe(usernameToEmail("hs.an"));
  });

  it("passes a real email through (lower-cased)", () => {
    expect(loginIdentifierToEmail("Teacher.Lan@Example.com")).toBe("teacher.lan@example.com");
  });

  it.each([
    ["too short", "ab"],
    ["spaces inside", "hs an"],
    ["Vietnamese letters", "học.sinh"],
    ["too long", "a".repeat(41)],
    ["broken email", "lan@"],
    ["empty", "   "],
  ])("rejects %s", (_label, input) => {
    expect(loginIdentifierToEmail(input)).toBeNull();
  });

  it("uses the same username rule as the database constraint", () => {
    expect(loginIdentifierToEmail("a_b-c.9")).toBe(usernameToEmail("a_b-c.9"));
  });
});

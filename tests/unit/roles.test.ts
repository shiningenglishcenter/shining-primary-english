import { describe, expect, it } from "vitest";
import { isAppRole, requiredRoleForPath, safeRedirectPath } from "@/lib/auth/roles";

describe("requiredRoleForPath", () => {
  it.each([
    ["/admin", "admin"],
    ["/admin/students/1", "admin"],
    ["/teacher", "teacher"],
    ["/learn/lessons/5", "student"],
    ["/parent/reports/9", "parent"],
  ] as const)("%s belongs to %s", (path, role) => {
    expect(requiredRoleForPath(path)).toBe(role);
  });

  it("does not match look-alike prefixes", () => {
    expect(requiredRoleForPath("/administrator")).toBeNull();
    expect(requiredRoleForPath("/learners")).toBeNull();
  });
});

describe("safeRedirectPath", () => {
  it("keeps a same-area path", () => {
    expect(safeRedirectPath("/admin/classes?tab=2", "admin")).toBe("/admin/classes?tab=2");
  });

  it("sends another role's area to the user's own home", () => {
    expect(safeRedirectPath("/admin", "student")).toBe("/learn");
  });

  it.each(["https://evil.example", "//evil.example/admin", "/\\evil.example", "javascript:alert(1)", ""])(
    "rejects unsafe target %j",
    (target) => {
      expect(safeRedirectPath(target, "teacher")).toBe("/teacher");
    },
  );

  it("does not loop back to login or forbidden", () => {
    expect(safeRedirectPath("/login", "parent")).toBe("/parent");
    expect(safeRedirectPath("/forbidden", "parent")).toBe("/parent");
  });
});

describe("isAppRole", () => {
  it("accepts only the four roles", () => {
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("superuser")).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
  });
});

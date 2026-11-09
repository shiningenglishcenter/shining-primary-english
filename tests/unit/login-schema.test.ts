import { describe, expect, it } from "vitest";
import { loginSchema } from "@/features/auth/schemas";

describe("loginSchema", () => {
  it("requires both fields with Vietnamese messages", () => {
    const result = loginSchema.safeParse({ identifier: "  ", password: "" });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((i) => i.message);
    expect(messages).toContain("Nhập tên đăng nhập hoặc email.");
    expect(messages).toContain("Nhập mật khẩu.");
  });

  it("trims the identifier but not the password", () => {
    const result = loginSchema.parse({ identifier: " hs.an ", password: " secret " });
    expect(result.identifier).toBe("hs.an");
    expect(result.password).toBe(" secret ");
  });
});

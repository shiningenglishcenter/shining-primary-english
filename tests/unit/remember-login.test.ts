import { describe, expect, it } from "vitest";
import { rememberedLogins, withLogin } from "@/features/auth/login-form";

/** Round 3 (D52): usernames remembered on the device, newest first, at most 3. */
describe("remembered logins", () => {
  it("reads a stored list safely", () => {
    expect(rememberedLogins(null)).toEqual([]);
    expect(rememberedLogins("not json")).toEqual([]);
    expect(rememberedLogins('["hs.an", 5, "hs.bin"]')).toEqual(["hs.an", "hs.bin"]);
  });
  it("puts the latest first, without duplicates, keeping 3", () => {
    expect(withLogin(["hs.an", "hs.bin", "hs.chi"], "HS.BIN")).toEqual(["HS.BIN", "hs.an", "hs.chi"]);
    expect(withLogin(["a", "b", "c"], "d")).toEqual(["d", "a", "b"]);
    expect(withLogin(["a"], "  ")).toEqual(["a"]);
  });
});

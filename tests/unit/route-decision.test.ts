import { describe, expect, it } from "vitest";
import { decideRoute, type RouteInput } from "@/lib/auth/route-decision";

const base: RouteInput = { pathname: "/", search: "", signedIn: false, role: null, hadAuthCookie: false };

describe("decideRoute", () => {
  it("sends visitors on / to login and users to their home", () => {
    expect(decideRoute(base)).toEqual({ type: "redirect", location: "/login" });
    expect(decideRoute({ ...base, signedIn: true, role: "parent" })).toEqual({
      type: "redirect",
      location: "/parent",
    });
  });

  it("asks signed-out visitors to log in and remembers where they were going", () => {
    expect(decideRoute({ ...base, pathname: "/admin/classes", search: "?x=1" })).toEqual({
      type: "redirect",
      location: "/login?next=%2Fadmin%2Fclasses%3Fx%3D1",
    });
  });

  it("marks the session as expired when an auth cookie was present but invalid", () => {
    const decision = decideRoute({ ...base, pathname: "/learn", hadAuthCookie: true });
    expect(decision).toEqual({ type: "redirect", location: "/login?next=%2Flearn&reason=expired" });
  });

  it("blocks other roles' areas", () => {
    expect(decideRoute({ ...base, pathname: "/admin", signedIn: true, role: "student" })).toEqual({
      type: "redirect",
      location: "/forbidden",
    });
  });

  it("blocks a session without a role", () => {
    expect(decideRoute({ ...base, pathname: "/learn", signedIn: true, role: null })).toEqual({
      type: "redirect",
      location: "/forbidden",
    });
  });

  it("lets the right role through", () => {
    expect(decideRoute({ ...base, pathname: "/teacher", signedIn: true, role: "teacher" })).toEqual({
      type: "next",
    });
  });

  it("moves signed-in users away from the login page", () => {
    expect(decideRoute({ ...base, pathname: "/login", signedIn: true, role: "admin" })).toEqual({
      type: "redirect",
      location: "/admin",
    });
  });

  it("leaves public pages open", () => {
    for (const pathname of ["/login", "/forbidden", "/api/health", "/auth/end-session"]) {
      expect(decideRoute({ ...base, pathname })).toEqual({ type: "next" });
    }
  });
});

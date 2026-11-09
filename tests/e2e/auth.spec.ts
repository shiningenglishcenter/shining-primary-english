import { expect, test } from "@playwright/test";
import { loginFromScratch, revokeAllSessions, signInAs } from "./helpers";

test.describe("login", () => {
  const cases = [
    { who: "student by username", id: "hs.an", home: /\/learn$/, title: /Hello/ },
    { who: "parent by username", id: "ph.an", home: /\/parent$/, title: "Việc học của con" },
    { who: "teacher by username", id: "gv.lan", home: /\/teacher$/, title: "Lớp của tôi" },
    { who: "admin by email", id: "admin@example.com", home: /\/admin$/, title: "Tổng quan trung tâm" },
  ];
  for (const c of cases) {
    test(`${c.who} lands on their dashboard @mobile`, async ({ page }) => {
      await page.goto("/login");
      await signInAs(page, c.id);
      await expect(page).toHaveURL(c.home);
      await expect(page.getByTestId("page-title")).toHaveText(c.title);
    });
  }

  test("username is not case-sensitive", async ({ page }) => {
    await page.goto("/login");
    await signInAs(page, "  HS.An ");
    await expect(page).toHaveURL(/\/learn$/);
  });

  test("wrong password and unknown user get the same message", async ({ page }) => {
    await page.goto("/login");
    await signInAs(page, "hs.an", "wrong-password");
    const error = page.getByTestId("login-error");
    await expect(error).toHaveText("Tên đăng nhập hoặc mật khẩu không đúng.");
    await expect(page.getByLabel("Tên đăng nhập")).toHaveValue("hs.an");

    await signInAs(page, "no.such.user", "whatever-123");
    await expect(error).toHaveText("Tên đăng nhập hoặc mật khẩu không đúng.");
  });

  test("empty form shows field messages", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByText("Nhập tên đăng nhập hoặc email.")).toBeVisible();
    await expect(page.getByText("Nhập mật khẩu.")).toBeVisible();
  });

  test("a deactivated account cannot sign in", async ({ page }) => {
    await page.goto("/login");
    await signInAs(page, "hs.khoa");
    await expect(page.getByTestId("login-error")).toContainText("tạm khoá");
    await page.goto("/learn");
    await expect(page).toHaveURL(/\/login/);
  });

  test("teacher dashboard lists only the assigned class", async ({ page }) => {
    await loginFromScratch(page, "gv.lan");
    await expect(page.getByTestId("teacher-classes")).toContainText("[SAMPLE] Movers A");
  });

  test("teacher without classes sees the empty state", async ({ page }) => {
    await loginFromScratch(page, "gv.minh");
    await expect(page.getByText("Bạn chưa được phân công lớp nào")).toBeVisible();
  });

  test("parent sees only their linked child", async ({ page }) => {
    await loginFromScratch(page, "ph.an");
    const children = page.getByTestId("parent-children");
    await expect(children).toContainText("[SAMPLE] Nguyễn Minh An");
    await expect(children).not.toContainText("Khoa");
  });
});

test.describe("logout", () => {
  test("signing out ends the session", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await page.getByTestId("sign-out").click();
    await expect(page).toHaveURL(/\/login\?reason=signed_out/);
    await expect(page.getByTestId("login-notice")).toHaveText("Bạn đã đăng xuất.");

    await page.goto("/learn");
    await expect(page).toHaveURL(/\/login\?next=%2Flearn/);
  });
});

test.describe("session expiry", () => {
  test("a session revoked on the server sends the user back to login", async ({ page }) => {
    await loginFromScratch(page, "ph.an");
    await revokeAllSessions("ph.an@users.shining.internal");
    await page.goto("/parent");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("login-notice")).toHaveText(
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    );
    // and the stale cookie is gone: logging in again works normally
    await signInAs(page, "ph.an");
    await expect(page).toHaveURL(/\/parent$/);
  });

  test("a corrupted session cookie is treated as expired", async ({ page, context }) => {
    await loginFromScratch(page, "hs.an");
    const cookies = await context.cookies();
    const auth = cookies.filter((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
    expect(auth.length).toBeGreaterThan(0);
    await context.clearCookies();
    await context.addCookies(auth.map((c) => ({ ...c, value: "base64-bm90LWEtc2Vzc2lvbg" })));

    await page.goto("/learn");
    await expect(page).toHaveURL(/\/login\?next=%2Flearn&reason=expired/);
    await expect(page.getByTestId("login-notice")).toContainText("hết hạn");
  });
});

test.describe("unauthorized access", () => {
  test("signed-out visitors are asked to log in, then returned to the page", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
    await signInAs(page, "admin@example.com");
    await expect(page).toHaveURL(/\/admin$/);
  });

  const blocked = [
    { who: "student", id: "hs.an", path: "/admin" },
    { who: "student", id: "hs.an", path: "/teacher" },
    { who: "parent", id: "ph.an", path: "/learn" },
    { who: "teacher", id: "gv.lan", path: "/admin" },
    { who: "admin", id: "admin@example.com", path: "/parent" },
  ];
  for (const b of blocked) {
    test(`${b.who} cannot open ${b.path}`, async ({ page }) => {
      await loginFromScratch(page, b.id);
      await page.goto(b.path);
      await expect(page).toHaveURL(/\/forbidden$/);
      await expect(page.getByTestId("page-title")).toHaveText("Bạn không có quyền mở trang này");
      await page.getByRole("link", { name: "Về trang của tôi" }).click();
      await expect(page).not.toHaveURL(/\/forbidden/);
    });
  }

  test("a login link cannot redirect into another role's area or off-site", async ({ page }) => {
    await page.goto("/login?next=%2Fadmin");
    await signInAs(page, "hs.an");
    await expect(page).toHaveURL(/\/learn$/);

    await page.getByTestId("sign-out").click();
    await expect(page).toHaveURL(/\/login\?reason=signed_out/);
    await page.goto("/login?next=%2F%2Fevil.example%2F");
    await signInAs(page, "hs.an");
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/learn$/);
  });

  test("signed-in users skip the login page", async ({ page }) => {
    await loginFromScratch(page, "gv.lan");
    await page.goto("/login");
    await expect(page).toHaveURL(/\/teacher$/);
  });
});

test("health check reports the database is reachable without user data", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ status: "ok", db: "ok" });
  expect(Object.keys(body).sort()).toEqual(["db", "dbLatencyMs", "status", "version"]);
});

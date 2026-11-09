import { expect, test, type Browser, type Page } from "@playwright/test";
import { loginFromScratch, signInAs } from "./helpers";

/**
 * Milestone 2: admin manages students, teachers and classes. Each run uses
 * unique names so it can be repeated against the same local database.
 */

/** Next.js keeps the previous page mounted but hidden; match the visible one. */
const title = (page: Page) => page.getByTestId("page-title").locator("visible=true");

const run = Date.now().toString(36).slice(-5);
const ANY_ID = "00000000-0000-4000-8000-000000000000";

const ADMIN_PAGES = [
  "/admin/students",
  "/admin/students/new",
  `/admin/students/${ANY_ID}`,
  "/admin/teachers",
  "/admin/teachers/new",
  `/admin/teachers/${ANY_ID}`,
  "/admin/classes",
  "/admin/classes/new",
  `/admin/classes/${ANY_ID}`,
];

test.describe("admin screens are admin-only", () => {
  for (const who of [
    { role: "teacher", id: "gv.lan" },
    { role: "student", id: "hs.an" },
    { role: "parent", id: "ph.an" },
  ]) {
    test(`${who.role} is refused on every admin screen`, async ({ page }) => {
      await loginFromScratch(page, who.id);
      for (const path of ADMIN_PAGES) {
        await page.goto(path);
        await expect(page, path).toHaveURL(/\/forbidden$/);
      }
    });
  }

  test("signed-out visitors are sent to login", async ({ page }) => {
    for (const path of ADMIN_PAGES) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/login\?next=/);
    }
  });

  test("admin opens every list and form", async ({ page }) => {
    await loginFromScratch(page, "admin@example.com");
    for (const [path, heading] of [
      ["/admin/students", "Học sinh"],
      ["/admin/students/new", "Thêm học sinh"],
      ["/admin/teachers", "Giáo viên"],
      ["/admin/teachers/new", "Thêm giáo viên"],
      ["/admin/classes", "Lớp học"],
      ["/admin/classes/new", "Thêm lớp"],
    ] as const) {
      await page.goto(path);
      await expect(title(page), path).toHaveText(heading);
    }
    await page.goto(`/admin/students/${ANY_ID}`);
    await expect(page.getByText("404")).toBeVisible();
  });
});

async function adminPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await loginFromScratch(page, "admin@example.com");
  return page;
}

async function signInFresh(browser: Browser, login: string, password: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await signInAs(page, login, password);
  return page;
}

async function readCredentials(page: Page) {
  const card = page.getByTestId("credentials");
  await expect(card).toBeVisible();
  return {
    login: (await card.getByTestId("credentials-login").textContent())!.trim(),
    password: (await card.getByTestId("credentials-password").textContent())!.trim(),
  };
}

test.describe.serial("class, student and teacher lifecycle", () => {
  const className = `E2E Flyers ${run}`;
  const studentName = `Phạm Thu Hà ${run}`;
  const teacherName = `Cô Ngọc ${run}`;
  let classUrl = "";
  let student = { login: "", password: "" };
  let studentUrl = "";

  test("admin creates a class with a level", async ({ browser }) => {
    const page = await adminPage(browser);
    await page.goto("/admin/classes/new");
    await page.getByRole("button", { name: "Tạo lớp" }).click();
    await expect(page.getByTestId("name-error")).toBeVisible();
    await expect(page.getByTestId("levelId-error")).toBeVisible();

    await page.getByLabel("Tên lớp").fill(className);
    await page.getByLabel("Trình độ").selectOption({ label: "Flyers" });
    await page.getByRole("button", { name: "Tạo lớp" }).click();
    await expect(page).toHaveURL(/\/admin\/classes\/[0-9a-f-]{36}$/);
    await expect(title(page)).toHaveText(className);
    await expect(page.getByText(`Mã lớp E2E-FLYERS-${run.toUpperCase()}`)).toBeVisible();
    classUrl = new URL(page.url()).pathname;

    await page.goto("/admin/classes");
    await expect(page.getByTestId("class-table")).toContainText(className);
  });

  test("admin creates a student with a login and puts them in the class", async ({ browser }) => {
    const page = await adminPage(browser);
    await page.goto("/admin/students/new");
    await page.getByLabel("Họ và tên").fill(studentName);
    await expect(page.getByLabel("Tên đăng nhập")).toHaveValue(new RegExp(`^hs\\.${run}$`));
    await page.getByLabel("Tên tiếng Anh (không bắt buộc)").fill("Hannah");
    await page.getByLabel("Xếp vào lớp (không bắt buộc)").selectOption({ label: className });
    await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue(/^[A-Z][a-z]+-[A-Z][a-z]+-\d{4}$/);
    await page.getByRole("button", { name: "Tạo học sinh" }).click();

    student = await readCredentials(page);
    expect(student.login).toMatch(new RegExp(`^hs\\.${run}\\d*$`));
    await page.getByRole("link", { name: "Xem hồ sơ học sinh" }).click();
    await expect(title(page)).toHaveText(studentName);
    await expect(page.getByTestId("student-classes")).toContainText(className);
    await expect(page.getByTestId("account-login")).toHaveText(student.login);
    studentUrl = new URL(page.url()).pathname;

    // The new student can sign in straight away.
    const kid = await signInFresh(browser, student.login, student.password);
    await expect(kid).toHaveURL(/\/learn$/);
    await expect(title(kid)).toContainText(studentName);
  });

  test("a second student with the same given name gets a numbered username", async ({ browser }) => {
    const page = await adminPage(browser);
    await page.goto("/admin/students/new");
    await page.getByLabel("Họ và tên").fill(`Lê Văn ${run}`);
    await page.getByRole("button", { name: "Tạo học sinh" }).click();
    const second = await readCredentials(page);
    expect(second.login).toBe(`hs.${run}2`);
  });

  test("admin creates a teacher and assigns them; the teacher sees the class", async ({ browser }) => {
    const page = await adminPage(browser);
    await page.goto("/admin/teachers/new");
    await page.getByLabel("Họ và tên").fill(teacherName);
    await page.getByLabel("Số điện thoại (không bắt buộc)").fill("0901234567");
    await page.getByRole("button", { name: "Tạo giáo viên" }).click();
    const teacher = await readCredentials(page);
    expect(teacher.login).toBe(`gv.${run}`);

    await page.goto(classUrl);
    await page.getByLabel("Giáo viên", { exact: true }).selectOption({ label: teacherName });
    await page.getByRole("button", { name: "Phân công" }).click();
    await expect(page.getByTestId("class-teachers")).toContainText(teacherName);

    const t = await signInFresh(browser, teacher.login, teacher.password);
    await expect(t).toHaveURL(/\/teacher$/);
    await expect(t.getByTestId("teacher-classes")).toContainText(className);
  });

  test("a teacher can also sign in with a real email", async ({ browser }) => {
    const page = await adminPage(browser);
    await page.goto("/admin/teachers/new");
    await page.getByLabel("Họ và tên").fill(`Thầy Email ${run}`);
    await page.getByLabel("Email thật của giáo viên").check();
    await page.getByLabel("Email", { exact: true }).fill(`teacher.${run}@example.com`);
    await page.getByRole("button", { name: "Tạo giáo viên" }).click();
    const teacher = await readCredentials(page);
    expect(teacher.login).toBe(`teacher.${run}@example.com`);
    const t = await signInFresh(browser, teacher.login, teacher.password);
    await expect(t).toHaveURL(/\/teacher$/);
  });

  test("locking an account stops sign-in; unlocking restores it", async ({ browser }) => {
    const page = await adminPage(browser);
    page.on("dialog", (d) => d.accept());
    await page.goto(studentUrl);
    await page.getByRole("button", { name: "Khoá tài khoản" }).click();
    await expect(page.getByTestId("account-locked")).toBeVisible();

    const kid = await signInFresh(browser, student.login, student.password);
    await expect(kid.getByTestId("login-error")).toHaveText(
      "Tài khoản này đã bị tạm khoá. Vui lòng liên hệ trung tâm.",
    );

    await page.getByRole("button", { name: "Mở khoá tài khoản" }).click();
    await expect(page.getByTestId("account-locked")).toBeHidden();
    await signInAs(kid, student.login, student.password);
    await expect(kid).toHaveURL(/\/learn$/);
  });

  test("resetting a password: the old one stops working, the new one works", async ({ browser }) => {
    const page = await adminPage(browser);
    await page.goto(studentUrl);
    await page.getByRole("button", { name: "Đặt lại mật khẩu" }).click();
    await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();
    const fresh = await readCredentials(page);
    expect(fresh.password).not.toBe(student.password);

    const old = await signInFresh(browser, student.login, student.password);
    await expect(old.getByTestId("login-error")).toHaveText("Tên đăng nhập hoặc mật khẩu không đúng.");
    await signInAs(old, student.login, fresh.password);
    await expect(old).toHaveURL(/\/learn$/);
    student = fresh;
  });

  test("editing a student updates the name they see after login", async ({ browser }) => {
    const page = await adminPage(browser);
    await page.goto(studentUrl);
    await page.getByLabel("Họ và tên").fill(`${studentName} Mới`);
    await page.getByRole("button", { name: "Lưu thay đổi" }).click();
    await expect(page.getByTestId("form-success")).toHaveText("Đã lưu thông tin học sinh.");
    await expect(title(page)).toHaveText(`${studentName} Mới`);

    const kid = await signInFresh(browser, student.login, student.password);
    await expect(title(kid)).toContainText(`${studentName} Mới`);
  });

  test("a student created without a login can get one later", async ({ browser }) => {
    const page = await adminPage(browser);
    await page.goto("/admin/students/new");
    await page.getByLabel("Họ và tên").fill(`Võ Minh Khang ${run}`);
    await page.getByLabel("Tạo tài khoản để học sinh đăng nhập làm bài").uncheck();
    await page.getByRole("button", { name: "Tạo học sinh" }).click();
    await expect(page.getByTestId("form-success")).toContainText("Đã tạo học sinh");
    await page.getByRole("link", { name: "Xem hồ sơ học sinh" }).click();

    const form = page.getByTestId("create-account-form");
    await expect(form.getByLabel("Tên đăng nhập")).toHaveValue(`hs.${run}`);
    await form.getByLabel("Tên đăng nhập").fill(`hs.khang${run}`);
    await form.getByRole("button", { name: "Tạo tài khoản" }).click();
    const creds = await readCredentials(page);
    expect(creds.login).toBe(`hs.khang${run}`);
    const kid = await signInFresh(browser, creds.login, creds.password);
    await expect(kid).toHaveURL(/\/learn$/);
  });

  test("enrol from the class page, then remove from the class", async ({ browser }) => {
    const page = await adminPage(browser);
    page.on("dialog", (d) => d.accept());
    await page.goto(classUrl);
    const enrol = page.getByTestId("enrol-form");
    await enrol.getByLabel("Lọc học sinh").fill(`Võ Minh Khang ${run}`);
    await enrol.getByRole("checkbox").first().check();
    await enrol.getByRole("button", { name: /Thêm 1 học sinh vào lớp/ }).click();
    const roster = page.getByTestId("class-students");
    await expect(roster).toContainText(`Võ Minh Khang ${run}`);

    await roster.getByRole("button", { name: `Cho Võ Minh Khang ${run} rời lớp` }).click();
    await expect(roster).not.toContainText(`Võ Minh Khang ${run}`);
    await expect(roster).toContainText(`${studentName} Mới`);
  });

  test("search finds students by name and by code", async ({ browser }) => {
    const page = await adminPage(browser);
    await page.goto(`/admin/students?q=${encodeURIComponent(`Thu Hà ${run}`)}`);
    await expect(page.getByTestId("student-count")).toHaveText("1 học sinh");
    const code = (await page.getByTestId("student-table").locator("tbody td").first().textContent())!.trim();
    expect(code).toMatch(/^HS\d{4,}$/);
    await page.goto(`/admin/students?q=${code}`);
    await expect(page.getByTestId("student-count")).toHaveText("1 học sinh");
    await page.goto("/admin/students?q=%25%2C(or)");
    await expect(title(page)).toHaveText("Học sinh");
  });
});

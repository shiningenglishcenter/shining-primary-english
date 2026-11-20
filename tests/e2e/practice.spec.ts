import { expect, test, type Browser, type Page } from "@playwright/test";
import { loginFromScratch } from "./helpers";

/** Phase 1: practice library (students) and content editor (staff). */

const run = Date.now().toString(36).slice(-5);
const title = (page: Page) => page.getByTestId("page-title").locator("visible=true");

async function as(browser: Browser, login: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await loginFromScratch(page, login);
  return page;
}

/** Answers the current round correctly, whatever the game (mixed rounds included). */
async function playThrough(page: Page) {
  const player = page.getByTestId("player");
  await expect(player).toBeVisible();
  for (let guard = 0; guard < 40; guard++) {
    if (await page.getByTestId("finish").isVisible()) return;
    const visible = async (id: string) => page.getByTestId(id).first().isVisible();
    if (await visible("flash-word")) {
      await page.getByTestId("next").click();
      continue;
    }
    if (await visible("match-picture")) {
      for (const w of await page
        .getByTestId("match-picture")
        .evaluateAll((els) =>
          els.filter((e) => !(e as HTMLButtonElement).disabled).map((e) => e.getAttribute("data-word")),
        )) {
        await page.locator(`[data-testid=match-picture][data-word="${w}"]`).click();
        await page.locator(`[data-testid=match-word][data-word="${w}"]`).click();
      }
    } else if (await visible("spell-slots")) {
      const answer = (await page.getByTestId("spell-slots").getAttribute("data-answer"))!;
      for (const ch of answer) {
        await page.locator(`[data-testid=letter][data-letter="${ch}"]:not([disabled])`).first().click();
      }
    } else if (await visible("sentence-line")) {
      const answer = (await page.getByTestId("sentence-line").getAttribute("data-answer"))!.split(" ");
      for (const w of answer) {
        await page.locator(`[data-testid=word-chip][data-word="${w}"]:not([disabled])`).first().click();
      }
      // checked automatically once every word is placed
    } else if (await visible("type-input")) {
      const input = page.getByTestId("type-input");
      await input.fill((await input.getAttribute("data-answer"))!);
      // checked automatically once the word's letters are typed
    } else {
      await page.locator("[data-testid=option][data-correct=true]").click();
    }
    await expect(page.getByTestId("feedback-right")).toBeVisible();
    await page.getByTestId("next").click();
  }
  await expect(page.getByTestId("finish")).toBeVisible();
}

test.describe("student practice library", () => {
  test("every programme and level is open @mobile", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await page.goto("/learn?level=starters");
    await expect(page.locator("[data-level=starters]")).toBeVisible();
    await expect(page.getByTestId("topic")).toHaveCount(12);
    await page.getByRole("link", { name: "Flyers" }).click();
    await expect(page.locator("[data-level=flyers]")).toBeVisible();
    await expect(page.getByTestId("no-topics")).toBeVisible();
    await page.getByRole("link", { name: "Global Success" }).click();
    await expect(page.locator("[data-level=g1]")).toBeVisible();
    await expect(page.getByTestId("topic")).toHaveCount(16);
  });

  test("English by default; Vietnamese on request, remembered", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await page.goto("/learn?level=starters");
    await expect(page.getByTestId("sign-out")).toHaveText("Log out");
    await page.getByTestId("lang-switch").getByRole("button", { name: "vi" }).click();
    await expect(page.getByTestId("sign-out")).toHaveText("Thoát");
    await page.reload();
    await expect(page.getByTestId("sign-out")).toHaveText("Thoát");
    await page.getByTestId("lang-switch").getByRole("button", { name: "en" }).click();
    await expect(page.getByTestId("sign-out")).toHaveText("Log out");
  });

  test("a student plays every game of a topic and earns stars", async ({ page }) => {
    test.setTimeout(150_000); // 11 activities, played to the end

    await loginFromScratch(page, "hs.an");
    await page.goto("/learn?level=starters");
    await page.getByTestId("topic").filter({ hasText: "Transport" }).click();
    await expect(page.getByTestId("activity")).toHaveCount(11);
    const hrefs = await page
      .getByTestId("activity")
      .evaluateAll((els) => els.map((e) => e.getAttribute("href")!));
    for (const href of hrefs) {
      await page.goto(href);
      await playThrough(page);
      await expect(page.getByTestId("finish").getByRole("img", { name: "3 out of 3 stars" })).toBeVisible();
    }
    await page.getByRole("link", { name: "Back to the topic" }).click();
    await expect(
      page.getByTestId("activity").first().getByRole("img", { name: "3 out of 3 stars" }),
    ).toBeVisible();
    await page.goto("/learn?level=starters");
    await expect(page.getByTestId("topic").filter({ hasText: "Transport" })).toContainText("11/11");
  });

  test("a wrong answer offers a hint and earns 1 point instead of 2", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await page.goto("/learn?level=starters");
    await page.getByTestId("topic").filter({ hasText: "Colours" }).click();
    await page.getByTestId("activity").filter({ hasText: "Yes or no?" }).click();
    await page.locator("[data-testid=option]:not([data-correct])").click();
    await expect(page.getByTestId("feedback-wrong")).toContainText("2 tries left");
    await page.getByTestId("hint-button").click();
    await expect(page.getByTestId("hint-text")).toBeVisible();
    await page.locator("[data-testid=option][data-correct=true]").click();
    await expect(page.getByTestId("feedback-right")).toBeVisible();
    await page.getByTestId("next").click();
    await playThrough(page);
    await expect(page.getByTestId("score")).toHaveText("Score: 11/12");
  });

  test("out of tries, the answer shows and the round moves on", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await page.goto("/learn?level=starters");
    await page.getByTestId("topic").filter({ hasText: "Colours" }).click();
    await page.getByTestId("activity").filter({ hasText: "Complete the sentence" }).click();
    for (let i = 0; i < 3; i++) {
      await page.locator("[data-testid=option]:not([data-correct]):not([disabled])").first().click();
    }
    await expect(page.getByTestId("feedback-failed")).toBeVisible();
    await expect(page.getByTestId("progress-text")).toHaveText(/^2\//, { timeout: 6000 });
  });
});

test.describe("practice content editor", () => {
  test("only staff open the editor", async ({ browser }) => {
    const kid = await as(browser, "hs.an");
    for (const path of ["/teacher/content", "/admin/content"]) {
      await kid.goto(path);
      await expect(kid, path).toHaveURL(/\/forbidden$/);
    }
    const teacher = await as(browser, "gv.lan");
    await teacher.goto("/admin/content");
    await expect(teacher).toHaveURL(/\/forbidden$/);
    await teacher.goto("/teacher/content");
    await expect(title(teacher)).toHaveText("Bài luyện");
    const admin = await as(browser, "admin@example.com");
    await admin.goto("/admin/content");
    await expect(admin.getByTestId("content-topics")).toContainText("Animals");
  });

  test("a teacher builds a Movers topic; students see it only once published", async ({ browser }) => {
    const teacher = await as(browser, "gv.lan");
    await teacher.goto("/teacher/content?level=movers");
    const topicName = `Weather ${run}`;
    const form = teacher.getByTestId("new-topic-form");
    await form.getByLabel("Tên chủ đề (tiếng Anh)").fill(topicName);
    await form.getByLabel("Tên chủ đề (tiếng Việt)").fill("Thời tiết");
    await form.getByLabel("Hình (dán emoji)").fill("☀️");
    await form.getByRole("button", { name: "Tạo chủ đề (bản nháp)" }).click();
    await expect(title(teacher)).toHaveText(topicName);

    // three words with pictures
    for (const [emoji, word, vi] of [
      ["☀️", `sunny${run}`, "nắng"],
      ["🌧️", `rainy${run}`, "mưa"],
      ["❄️", `snowy${run}`, "tuyết"],
    ]) {
      const add = teacher.getByTestId("add-word-form");
      await add.getByLabel("Emoji").fill(emoji!);
      await add.getByLabel("Từ mới", { exact: true }).fill(word!);
      await add.getByLabel("Nghĩa của từ mới").fill(vi!);
      await add.getByRole("button", { name: "Thêm từ" }).click();
      await expect(teacher.getByTestId("add-word-ok")).toContainText(word!);
    }
    await expect(teacher.getByTestId("word-row")).toHaveCount(3);

    // Next.js keeps the previous page mounted but hidden: scope to the visible form.
    const af = () => teacher.getByTestId("activity-form").locator("visible=true");

    // a word game + a sentence game
    await teacher
      .getByLabel("Dạng bài mới")
      .locator("visible=true")
      .selectOption({ label: "Nhìn hình chọn từ" });
    await teacher.getByRole("button", { name: "Thêm bài" }).locator("visible=true").click();
    await expect(af().getByTestId("word-picker")).toBeVisible();
    await af().getByLabel("Trạng thái").selectOption("published");
    await af().getByRole("button", { name: "Lưu bài" }).click();
    await expect(af().getByTestId("form-success")).toHaveText("Đã lưu và xuất bản.");

    await teacher.getByRole("link", { name: topicName }).locator("visible=true").click();
    await teacher
      .getByLabel("Dạng bài mới")
      .locator("visible=true")
      .selectOption({ label: "Chọn từ điền vào câu" });
    await teacher.getByRole("button", { name: "Thêm bài" }).locator("visible=true").click();
    await af().getByRole("button", { name: "Thêm câu" }).click();
    await af().getByLabel("Câu 1", { exact: true }).fill("It is sunny today.");
    await af().getByLabel("Đáp án đúng câu 1").fill("sunny");
    await af().getByLabel("Đáp án sai 1 câu 1").fill("rainy");
    await af().getByLabel("Trạng thái").selectOption("published");
    await af().getByRole("button", { name: "Lưu bài" }).click();
    await expect(af().getByTestId("form-error")).toContainText("Câu 1: Câu phải có chỗ trống ___");
    await af().getByLabel("Câu 1", { exact: true }).fill("It is ___ today.");
    await af().getByRole("button", { name: "Lưu bài" }).click();
    await expect(af().getByTestId("form-success")).toHaveText("Đã lưu và xuất bản.");

    // still a draft topic: students don't see it
    const kid = await as(browser, "hs.an");
    await kid.goto("/learn?level=movers");
    await expect(kid.getByText(topicName)).toHaveCount(0);

    // publish the topic
    await teacher.getByRole("link", { name: topicName }).locator("visible=true").click();
    await teacher
      .getByTestId("topic-form")
      .locator("visible=true")
      .getByLabel("Trạng thái")
      .selectOption("published");
    await teacher.getByRole("button", { name: "Lưu chủ đề" }).locator("visible=true").click();
    await expect(
      teacher.getByTestId("topic-form").locator("visible=true").getByTestId("form-success"),
    ).toHaveText("Đã lưu chủ đề.");

    await kid.goto("/learn?level=movers");
    await kid.getByTestId("topic").filter({ hasText: topicName }).click();
    await expect(kid.getByTestId("activity")).toHaveCount(2);
    for (const href of await kid
      .getByTestId("activity")
      .evaluateAll((els) => els.map((e) => e.getAttribute("href")!))) {
      await kid.goto(href);
      await playThrough(kid);
    }
  });
});

test.describe("guest links (no login needed)", () => {
  test("off by default; a guest plays under a first name; the teacher sees it; switching off stops the link", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const teacher = await as(browser, "gv.lan");
    await teacher.goto("/teacher/content?level=starters");
    await teacher.getByRole("link", { name: "Colours" }).first().click();
    await teacher
      .getByRole("link", { name: /Nhìn hình chọn từ/ })
      .locator("visible=true")
      .first()
      .click();
    await expect(teacher).toHaveURL(/\/teacher\/content\/activities\//);
    const editorUrl = teacher.url();
    const panel = teacher.getByTestId("guest-link").locator("visible=true");
    const toggle = panel.getByTestId("guest-switch");
    if ((await toggle.getAttribute("aria-checked")) === "true") await toggle.click(); // clean state from a rerun
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    const url = await panel.getByTestId("share-url").inputValue();
    expect(url).toMatch(/\/p\/[A-Za-z0-9_-]{16,40}$/);

    const guest = await (await browser.newContext()).newPage();
    await guest.goto(url);
    const name = `Bin${run}`;
    await guest.getByTestId("guest-name").fill(name);
    await guest.getByTestId("guest-start").click();
    await expect(guest.getByTestId("guest-hello")).toContainText(name);
    await playThrough(guest);
    await expect(guest.getByTestId("guest-login")).toBeVisible();

    await teacher.goto("/teacher/results?view=guests");
    await expect(teacher.getByTestId("results-guests")).toContainText(name);

    await teacher.goto(editorUrl);
    const toggle2 = teacher.getByTestId("guest-link").locator("visible=true").getByTestId("guest-switch");
    await toggle2.click();
    await expect(toggle2).toHaveAttribute("aria-checked", "false");
    await guest.goto(url);
    await expect(guest.getByTestId("guest-link-off")).toBeVisible();
  });
});

test.describe("user guide", () => {
  test("opens without logging in and is linked from the login screen", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Xem hướng dẫn sử dụng" }).click();
    await expect(page).toHaveURL(/\/huong-dan$/);
    await expect(page.getByTestId("page-title")).toHaveText("Hướng dẫn sử dụng SHINING");
    await expect(page.locator("#soan-bai img").first()).toBeVisible();
    await expect(page.getByTestId("guide-overview")).toContainText("Starters");
    await expect(page.getByTestId("guide-overview")).toContainText("12 chủ đề");
  });
});

test.describe("login screen", () => {
  test("Vietnamese by default, English on request @mobile", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-title")).toHaveText("Chào mừng con!");
    await page.getByTestId("lang-switch").getByRole("button", { name: "en" }).click();
    await expect(page.getByTestId("login-title")).toHaveText("Welcome!");
    await page.getByLabel("Username").fill("hs.an");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByTestId("login-error")).toHaveText("The username or password is not right.");
    await page.getByTestId("lang-switch").getByRole("button", { name: "vi" }).click();
    await expect(page.getByTestId("login-title")).toHaveText("Chào mừng con!");
  });
});

test.describe("pilot feedback", () => {
  // 1×1 PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  test("a teacher sends a bug with a screenshot from the floating button; only admins read it", async ({
    browser,
  }) => {
    const teacher = await as(browser, "gv.lan");
    await teacher.goto("/teacher/results");
    await teacher.getByTestId("feedback-fab").click();
    await expect(teacher).toHaveURL(/\/gop-y\?from=%2Fteacher%2Fresults/);
    const description = `Nút Next không bấm được ${run}`;
    await teacher.getByTestId("feedback-name").fill("Cô Lan");
    await teacher.getByTestId("feedback-phone").fill("0912 345 678");
    await teacher.getByTestId("feedback-idea").fill(`Thêm trò thi đua theo nhóm ${run}`);
    await teacher.getByTestId("feedback-description").fill(description);
    await teacher
      .getByTestId("feedback-image")
      .last()
      .setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: png });
    await expect(teacher.getByRole("img", { name: "Ảnh 1" })).toBeVisible();
    await teacher.getByTestId("feedback-submit").click();
    await expect(teacher.getByTestId("feedback-sent")).toBeVisible();

    await teacher.goto("/admin/gop-y");
    await expect(teacher).toHaveURL(/\/forbidden/);

    const admin = await as(browser, "admin@example.com");
    await admin.goto("/admin/gop-y");
    const entry = admin.getByTestId("feedback-entry").filter({ hasText: description });
    await expect(entry).toBeVisible();
    await expect(entry).toContainText("/teacher/results");
    await expect(entry).toContainText("Zalo 0912345678");
    await expect(entry).toContainText(`Thêm trò thi đua theo nhóm ${run}`);
    await expect(entry.getByRole("img", { name: "Ảnh chụp màn hình" })).toBeVisible();
  });

  test("the feedback page needs no login; pupils get no floating button", async ({ page }) => {
    await page.goto("/gop-y");
    await expect(page.getByTestId("page-title")).toHaveText("Góp ý dùng thử SHINING");
    await page.getByTestId("feedback-submit").click();
    await expect(page.getByTestId("feedback-error")).toContainText("họ tên");
    await page.getByTestId("feedback-name").fill("Cô Mai");
    await page.getByTestId("feedback-phone").fill("123");
    await page.getByTestId("feedback-submit").click();
    await expect(page.getByTestId("feedback-error")).toContainText("Zalo");
    await page.getByTestId("feedback-phone").fill("0987654321");
    await page.getByTestId("feedback-submit").click();
    await expect(page.getByTestId("feedback-error")).toContainText("ít nhất một");
    await loginFromScratch(page, "hs.an");
    await expect(page.getByTestId("feedback-fab")).toHaveCount(0);
  });
});

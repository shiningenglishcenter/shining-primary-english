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

/** Answers the current round correctly, whatever the game. */
async function playThrough(page: Page) {
  const player = page.getByTestId("player");
  await expect(player).toBeVisible();
  const kind = await player.getAttribute("data-kind");
  for (let guard = 0; guard < 30; guard++) {
    if (await page.getByTestId("finish").isVisible()) return;
    if (kind === "flashcards") {
      await page.getByTestId("next").click();
      continue;
    }
    if (kind === "match") {
      for (const w of await page
        .getByTestId("match-picture")
        .evaluateAll((els) =>
          els.filter((e) => !(e as HTMLButtonElement).disabled).map((e) => e.getAttribute("data-word")),
        )) {
        await page.locator(`[data-testid=match-picture][data-word="${w}"]`).click();
        await page.locator(`[data-testid=match-word][data-word="${w}"]`).click();
      }
    } else if (kind === "spell") {
      const answer = (await page.getByTestId("spell-slots").getAttribute("data-answer"))!;
      for (const ch of answer) {
        await page.locator(`[data-testid=letter][data-letter="${ch}"]:not([disabled])`).first().click();
      }
    } else if (kind === "rearrange") {
      const answer = (await page.getByTestId("sentence-line").getAttribute("data-answer"))!.split(" ");
      for (const w of answer) {
        await page.locator(`[data-testid=word-chip][data-word="${w}"]:not([disabled])`).first().click();
      }
      await page.getByTestId("check").click();
    } else {
      await page.locator("[data-testid=option][data-correct=true]").click();
    }
    await expect(page.getByTestId("feedback-right")).toBeVisible();
    await page.getByTestId("next").click();
  }
  await expect(page.getByTestId("finish")).toBeVisible();
}

test.describe("student practice library", () => {
  test("every level is open, each with its own theme @mobile", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await page.goto("/learn?level=starters");
    await expect(page.locator("[data-level=starters]")).toBeVisible();
    await expect(page.getByTestId("topic")).toHaveCount(12);
    await page.getByRole("link", { name: "Flyers" }).click();
    await expect(page.locator("[data-level=flyers]")).toBeVisible();
    await expect(page.getByTestId("no-topics")).toBeVisible();
  });

  test("a student plays every game of a topic and earns stars", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await page.goto("/learn?level=starters");
    await page.getByTestId("topic").filter({ hasText: "Transport" }).click();
    await expect(page.getByTestId("activity")).toHaveCount(8);
    const hrefs = await page
      .getByTestId("activity")
      .evaluateAll((els) => els.map((e) => e.getAttribute("href")!));
    for (const href of hrefs) {
      await page.goto(href);
      await playThrough(page);
      await expect(page.getByTestId("finish").getByRole("img", { name: "3 trên 3 sao" })).toBeVisible();
    }
    await page.getByRole("link", { name: "Về chủ đề" }).click();
    await expect(
      page.getByTestId("activity").first().getByRole("img", { name: "3 trên 3 sao" }),
    ).toBeVisible();
    await page.goto("/learn?level=starters");
    await expect(page.getByTestId("topic").filter({ hasText: "Transport" })).toContainText("8/8 bài");
  });

  test("a wrong first answer gives a hint and costs the point", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await page.goto("/learn?level=starters");
    await page.getByTestId("topic").filter({ hasText: "Colours" }).click();
    await page.getByTestId("activity").filter({ hasText: "Đúng hay sai?" }).click();
    await page.locator("[data-testid=option]:not([data-correct])").click();
    await expect(page.getByTestId("feedback-wrong")).toBeVisible();
    await page.locator("[data-testid=option][data-correct=true]").click();
    await expect(page.getByTestId("feedback-right")).toBeVisible();
    await page.getByTestId("next").click();
    await playThrough(page);
    await expect(page.getByTestId("score")).toHaveText("Đúng ngay lần đầu: 5/6");
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

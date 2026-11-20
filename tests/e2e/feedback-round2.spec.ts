import { expect, test, type Browser, type Page } from "@playwright/test";
import { loginFromScratch } from "./helpers";

/** Teacher feedback, round 2 (ARCHITECTURE D42–). */

const run = Date.now().toString(36).slice(-5);

async function as(browser: Browser, login: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await loginFromScratch(page, login);
  return page;
}

/** A 64×48 red PNG, drawn in the page (no fixture file in the repository). */
async function redPng(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 48;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#e33";
    ctx.fillRect(0, 0, 64, 48);
    return c.toDataURL("image/png").split(",")[1]!;
  });
  return Buffer.from(b64, "base64");
}

test.describe("teacher feedback round 2", () => {
  test("A1: pick pictures by English/Vietnamese search or upload one; pupils see the upload", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const teacher = await as(browser, "gv.lan");
    await teacher.goto("/teacher/content?level=movers");
    const topicName = `Garden ${run}`;
    const form = teacher.getByTestId("new-topic-form");
    await form.getByLabel("Tên chủ đề (tiếng Anh)").fill(topicName);
    await form.getByLabel("Tên chủ đề (tiếng Việt)").fill("Khu vườn");
    // Picker suggests from the English title.
    await form.getByTestId("emoji-picker-open").click();
    const picker = teacher.getByTestId("emoji-picker").locator("visible=true");
    await picker.getByTestId("emoji-search").fill("hoa");
    await picker.getByTestId("emoji-results").locator("button").first().click();
    await expect(form.getByLabel("Hình (dán emoji)")).not.toHaveValue("");
    await form.getByRole("button", { name: "Tạo chủ đề (bản nháp)" }).click();
    await expect(teacher.getByTestId("page-title").locator("visible=true")).toHaveText(topicName);

    const add = teacher.getByTestId("add-word-form");
    // 1) suggestions for the typed word
    await add.getByLabel("Từ mới", { exact: true }).fill("cat");
    await add.getByTestId("emoji-picker-open").click();
    await picker.locator('[data-testid=emoji-suggestions] [data-code="1f408"]').click();
    await expect(add.getByLabel("Emoji")).toHaveValue("🐈");
    await add.getByLabel("Từ mới", { exact: true }).fill(`kitty${run}`);
    await add.getByLabel("Nghĩa của từ mới").fill("mèo con");
    await add.getByRole("button", { name: "Thêm từ" }).click();
    await expect(teacher.getByTestId("add-word-ok")).toContainText(`kitty${run}`);

    // 2) Vietnamese search, without accents
    await add.getByTestId("emoji-picker-open").click();
    await picker.getByTestId("emoji-search").fill("tao do");
    await picker.locator('[data-testid=emoji-results] [data-code="1f34e"]').click();
    await add.getByLabel("Từ mới", { exact: true }).fill(`apple${run}`);
    await add.getByLabel("Nghĩa của từ mới").fill("quả táo");
    await add.getByRole("button", { name: "Thêm từ" }).click();
    await expect(teacher.getByTestId("add-word-ok")).toContainText(`apple${run}`);

    // 3) an uploaded picture, no emoji
    await add.getByTestId("word-image-input").setInputFiles({
      name: "garden.png",
      mimeType: "image/png",
      buffer: await redPng(teacher),
    });
    await expect(add.getByTestId("word-image-preview")).toBeVisible();
    await add.getByLabel("Từ mới", { exact: true }).fill(`garden${run}`);
    await add.getByLabel("Nghĩa của từ mới").fill("khu vườn");
    await add.getByRole("button", { name: "Thêm từ" }).click();
    await expect(teacher.getByTestId("add-word-ok")).toContainText(`garden${run}`);
    const row = teacher
      .getByTestId("word-row")
      .filter({ has: teacher.locator(`input[value="garden${run}"]`) });
    await expect(row.getByTestId("word-image-preview")).toHaveAttribute(
      "src",
      /\/storage\/v1\/object\/sign\//,
    );

    // too big a file is refused before upload
    await add.getByTestId("word-image-input").setInputFiles({
      name: "big.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(2 * 1024 * 1024 + 10),
    });
    await expect(add.getByRole("alert")).toContainText("lớn hơn 2 MB");

    // flashcards from the words, published with the topic
    const next = teacher.getByTestId("next-step").locator("visible=true");
    await next.getByTestId("quick-create").click();
    await expect(next.getByTestId("form-success")).toContainText("Đã tạo 5 bài nháp");
    await teacher
      .getByTestId("topic-activities")
      .locator("visible=true")
      .getByText("Thẻ từ", { exact: true })
      .first()
      .click();
    const af = teacher.getByTestId("activity-form").locator("visible=true");
    await af.getByLabel("Trạng thái").selectOption("published");
    await af.getByRole("button", { name: "Lưu bài" }).click();
    await expect(af.getByTestId("form-success")).toHaveText("Đã lưu và xuất bản.");
    await teacher.getByRole("link", { name: topicName }).locator("visible=true").click();
    const tf = teacher.getByTestId("topic-form").locator("visible=true");
    await tf.getByLabel("Trạng thái").selectOption("published");
    await teacher.getByRole("button", { name: "Lưu chủ đề" }).locator("visible=true").click();
    await expect(tf.getByTestId("form-success")).toHaveText("Đã lưu chủ đề.");

    const kid = await as(browser, "hs.an");
    await kid.goto("/learn?level=movers");
    await kid.getByTestId("topic").filter({ hasText: topicName }).click();
    await kid.getByTestId("activity").first().click();
    for (let i = 0; i < 3; i++) {
      if ((await kid.getByTestId("flash-word").textContent()) === `garden${run}`) break;
      await kid.getByTestId("next").click();
    }
    await expect(kid.getByTestId("flash-word")).toHaveText(`garden${run}`);
    await expect(kid.getByTestId("flash-card").locator("img").first()).toHaveAttribute(
      "src",
      /\/storage\/v1\/object\/sign\/learning-media\/practice\/images\//,
    );
  });
});

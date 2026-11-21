import { expect, test, type Page } from "@playwright/test";
import { loginFromScratch, openNewTopicForm, topicTab } from "./helpers";

/** Teacher feedback, round 1 (ARCHITECTURE D40): C3, C4, C5, C8, C10, A2. */

const run = Date.now().toString(36).slice(-5);

async function openActivity(page: Page, topic: string, activity: string) {
  await page.goto("/learn?level=starters");
  await page.getByTestId("topic").filter({ hasText: topic }).click();
  await page.getByTestId("activity").filter({ hasText: activity }).first().click();
  await expect(page.getByTestId("player")).toBeVisible();
}

test.describe("teacher feedback round 1", () => {
  test("C3: Yes/No allows one answer; a wrong one shows the answer and moves on", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await openActivity(page, "Colours", "Yes or no?");
    await page.locator("[data-testid=option]:not([data-correct])").click();
    await expect(page.getByTestId("feedback-failed")).toBeVisible();
    await expect(page.getByTestId("feedback-wrong")).toHaveCount(0);
    await expect(page.getByTestId("revealed-answer")).toHaveText(/^(Yes|No)$/);
    // Both buttons are locked: no second guess.
    await expect(page.locator("[data-testid=option][data-correct=true]")).toBeDisabled();
    await expect(page.getByTestId("progress-text")).toHaveText(/^2\//, { timeout: 6000 });
  });

  test("C10: a flashcard flips to show the Vietnamese meaning (English interface too)", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await openActivity(page, "Animals", "Flashcards");
    const card = page.getByTestId("flash-card");
    await expect(card).toHaveAttribute("data-flipped", "false");
    await card.click();
    await expect(card).toHaveAttribute("data-flipped", "true");
    await expect(page.getByTestId("flash-meaning")).toHaveText(/con /);
    await expect(page.getByText("Flip back")).toBeVisible();
  });

  test("C5: match shows 6 pairs on wide screens, 4 on phones @mobile", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await openActivity(page, "Animals", "Match");
    const wide = (page.viewportSize()?.width ?? 0) >= 768;
    await expect(page.getByTestId("match-board")).toHaveAttribute("data-pairs", wide ? "6" : "4");
    await expect(page.getByTestId("progress-text")).toHaveText(wide ? "1/2" : "1/3");
  });

  test("C4: when the browser keeps sound off, a small tip asks to turn it on", async ({ page }) => {
    // A stand-in AudioContext that never starts, like a browser blocking audio.
    await page.addInitScript(() => {
      class Blocked {
        state = "suspended";
        currentTime = 0;
        destination = {};
        resume() {
          return Promise.resolve();
        }
        createOscillator() {
          return {
            connect: () => ({ connect: () => {} }),
            start() {},
            stop() {},
            type: "",
            frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          };
        }
        createGain() {
          return { connect: () => {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } };
        }
      }
      (window as unknown as { AudioContext: unknown }).AudioContext = Blocked;
    });
    await loginFromScratch(page, "hs.an");
    await openActivity(page, "Colours", "Listen and choose");
    await page.locator("[data-testid=option]").first().click();
    await expect(page.getByTestId("sound-tip")).toHaveAttribute("data-tip", "blocked");
    await page.getByTestId("sound-tip").getByRole("button", { name: "Close" }).click();
    await expect(page.getByTestId("sound-tip")).toHaveCount(0);
  });

  test("C8: seeded GS1 sentence games have at least 6 questions", async ({ page }) => {
    await loginFromScratch(page, "hs.an");
    await page.goto("/learn?level=g1");
    await page.getByTestId("topic").first().click();
    await page.getByTestId("activity").filter({ hasText: "Make a sentence" }).click();
    await expect(page.getByTestId("progress-text")).toHaveText("1/6");
  });

  test("A2: after the word list, one click creates draft word games from the words", async ({ browser }) => {
    const teacher = await (await browser.newContext()).newPage();
    await loginFromScratch(teacher, "gv.lan");
    await teacher.goto("/teacher/content?level=movers");
    const topicName = `Pets ${run}`;
    const form = await openNewTopicForm(teacher);
    await form.getByLabel("Tên chủ đề (tiếng Anh)").fill(topicName);
    await form.getByLabel("Tên chủ đề (tiếng Việt)").fill("Thú cưng");
    await form.getByLabel("Hình (dán emoji)").fill("🐈");
    await form.getByRole("button", { name: "Tạo chủ đề (bản nháp)" }).click();
    await expect(teacher.getByTestId("page-title").locator("visible=true")).toHaveText(topicName);

    await topicTab(teacher, "activities");
    const next = teacher.getByTestId("next-step").locator("visible=true");
    await expect(next).toContainText("Bước tiếp theo: tạo bài luyện");
    await expect(next.getByTestId("quick-create")).toBeDisabled();
    await topicTab(teacher, "words");

    for (const [emoji, word, vi] of [
      ["🐈", `kitty${run}`, "mèo con"],
      ["🐕", `puppy${run}`, "chó con"],
      ["🐟", `goldfish${run}`, "cá vàng"],
    ]) {
      const add = teacher.getByTestId("add-word-form");
      await add.getByLabel("Emoji").fill(emoji!);
      await add.getByLabel("Từ mới", { exact: true }).fill(word!);
      await add.getByLabel("Nghĩa của từ mới").fill(vi!);
      await add.getByRole("button", { name: "Thêm từ" }).click();
      await expect(teacher.getByTestId("add-word-ok")).toContainText(word!);
    }
    await topicTab(teacher, "activities");
    await next.getByTestId("quick-create").click();
    await expect(next.getByTestId("form-success")).toContainText("Đã tạo 5 bài nháp");
    const list = teacher.getByTestId("topic-activities").locator("visible=true");
    for (const label of [
      "Thẻ từ",
      "Nhìn hình chọn từ",
      "Nghe và chọn hình",
      "Nối từ với hình",
      "Xếp chữ thành từ",
    ]) {
      await expect(list.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(next.getByTestId("quick-create")).toBeDisabled();
    await expect(next.getByTestId("quick-create")).toHaveText(/Đã có đủ bài từ vựng/);
  });
});
